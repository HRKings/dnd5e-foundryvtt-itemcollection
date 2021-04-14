import { warn, error, debug, i18n } from "../ItemCollection";
import { MODULE_NAME } from "./settings";
import {libWrapper} from './libs/shim.js'

export let readyHooks = async () => {
  warn("Ready Hooks processing");
  
}

export let initHooks = () => {
  warn("Init Hooks processing");

  // setup all the hooks

}

export let setupHooks = () => {
  warn("Setup Hooks processing");

  // setup all the hooks

  console.warn("Itemcontainers initialisation");

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register(MODULE_NAME, "CONFIG.Item.entityClass.prototype.prepareData", _prepareData, "WRAPPER");
    libWrapper.register(MODULE_NAME, "CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities", _prepareEmbeddedEntities, "WRAPPER");
    libWrapper.register(MODULE_NAME, "CONFIG.Item.entityClass.prototype.createEmbeddedEntity", _createEmbeddedEntity, "MIXED");
    libWrapper.register(MODULE_NAME, "CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity", _deleteEmbeddedEntity, "MIXED");
    libWrapper.register(MODULE_NAME, "CONFIG.Item.entityClass.prototype.updateEmbeddedEntity", _updateEmbeddedEntity, "MIXED");
  } else {
    const oldPrepareData = CONFIG.Item.entityClass.prototype.prepareData;
    CONFIG.Item.entityClass.prototype.prepareData = function () {
      return _prepareData.call(this, oldPrepareData.bind(this), ...arguments);
    };

    const oldPrepareEmbeddedEntities = CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities;
    CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities = function () {
      return _prepareEmbeddedEntities.call(this, oldPrepareEmbeddedEntities.bind(this), ...arguments);
    };

    const oldCreateEmbeddedEntity = CONFIG.Item.entityClass.prototype.createEmbeddedEntity;
    CONFIG.Item.entityClass.prototype.createEmbeddedEntity = function () {
      return _createEmbeddedEntity.call(this, oldCreateEmbeddedEntity.bind(this), ...arguments);
    };

    const oldDeleteEmbeddedEntity = CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity;
    CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity = function () {
      return _deleteEmbeddedEntity.call(this, oldDeleteEmbeddedEntity.bind(this), ...arguments);
    };

    const oldUpdateEmbeddedEntity = CONFIG.Item.entityClass.prototype.updateEmbeddedEntity;
    CONFIG.Item.entityClass.prototype.updateEmbeddedEntity = function () {
      return _updateEmbeddedEntity.call(this, oldUpdateEmbeddedEntity.bind(this), ...arguments);
    };
  }

  console.assert(CONFIG.Item.entityClass.prototype.updateParent === undefined);
  CONFIG.Item.entityClass.prototype.updateParent = _updateParent;

  console.assert(CONFIG.Item.entityClass.prototype.createOwnedItem === undefined);
  CONFIG.Item.entityClass.prototype.createOwnedItem = _createOwnedItem;

  console.assert(CONFIG.Item.entityClass.prototype.deleteOwnedItem === undefined);
  CONFIG.Item.entityClass.prototype.deleteOwnedItem = _deleteOwnedItem;

  console.assert(CONFIG.Item.entityClass.prototype.updateOwnedItem === undefined);
  CONFIG.Item.entityClass.prototype.updateOwnedItem = _updateOwnedItem;

  console.assert(CONFIG.Item.entityClass.prototype.getSpellDC === undefined);
  CONFIG.Item.entityClass.prototype.getSpellDC = _getSpellDC;

}

// ********************* TP *************
function _prepareData(wrapped, ...args) {
  // need to set this so we can pretend to be an actor
  setProperty(this.data, "data.attributes.spelldc", 10);
  if (!this.data._id) this.data._id = this.data.id; // a fix for itemcollection owned items
  // prepareEmbeddedItems.call(this);
  return wrapped(...args);
}

function prepareEmbeddedItems() {
    if (hasProperty(this, "data.flags.itemcollection.contents")) {
      const existing = (this.items || []).reduce((obj, i) => {
        obj[i.id] = i;
        return obj;
      }, {});
  
      // Prepare the new Item index
      const items = this.data.flags.itemcollection.contents.map(i => {
          const item = Item.createOwned(i, null);
          item.options.actor = this;
          return item;
      });
      this.items = items;
    }
}

function _prepareEmbeddedEntities(wrapped, ...args) {
  prepareEmbeddedItems.call(this);
  return wrapped(...args);
}

async function _updateParent(contents) {
  if (this.actor.data.flags.itemcollection || this.actor.isToken) {
    this.data.flags.itemcollection.contents = contents;
  }
  await this.actor.updateOwnedItem({"_id": this._id, "flags.itemcollection.contents": contents});
  await this.update({"_id": this._id, "flags.itemcollection.contents": contents})
}

async function _createEmbeddedEntity(wrapped, ...args) {
  const [ collection, data, options ] = args;
  if (collection === "OwnedItem") {
    await this.createOwnedItem(data, options)
  } else {
    return await wrapped(...args);
  }
}

async function _createOwnedItem(itemData, options = {}) {
  if (this.type === "backpack" && this.data.flags.itemcollection) {
    var contents = duplicate(this.data.flags.itemcollection.contents);
    // var contents = this.data.flags.itemcollection.contents;
    itemData._id = contents.length ? Math.max(...contents.map(i => i._id)) + 1 : 1;
    console.log(`${MODULE_NAME} | Created item ${itemData._id}`)
    contents.push(itemData);

    if (this.isOwned) {
      await this.updateParent(contents);
    } else {
      await this.setFlag(MODULE_NAME, "contents", contents);
    }
    this.prepareEmbeddedEntities();
    this.prepareData();
    this.render(false);
    return true;
  }
}

async function _deleteEmbeddedEntity(wrapped, ...args) {
  const [ collection, data, options ] = args;
  if (collection === "OwnedItem") {
    await this.deleteOwnedItem(data, options)
  } else {
    return await wrapped(...args);
  }
}

async function _deleteOwnedItem(deleted) {
  let contents = duplicate(this.data.flags.itemcollection.contents);
  // let contents = this.data.flags.itemcollection.contents;
  if (!contents) return;
  let idx = contents.findIndex(o => o._id === deleted || Number(o._id) === deleted);
  if (idx === -1) throw new Error(`OwnedItem ${deleted} not found in Bag ${this._id}`);
  contents.splice(idx,1);
  console.log(`ItemCollection | Deleted Item ${deleted} from bag ${this._id}`);
  if (this.isOwned) {
    await this.updateParent(contents);
   } else {
     await this.update({"flags.itemcollection.contents": contents});
   }
   this.prepareEmbeddedEntities()
}

async function _updateEmbeddedEntity(wrapped, ...args) {
  const [ collection, data, options ] = args;
  if (collection === "OwnedItem") {
    await this.updateOwnedItem(data, options)
  } else {
    return await wrapped(...args);
  }
}

async function _updateOwnedItem(itemChanges, options) {
  let contents = duplicate(this.data.flags.itemcollection.contents);
  // let contents = this.data.flags.itemcollection.contents;
  if (!contents) return;
  let idx = contents.findIndex(o => o._id === itemChanges._id);
  if (idx === -1) throw new Error(`OwnedItem ${itemChanges._id} not found in Bag ${this._id}`);
  let itemData = contents[idx];
  itemChanges = expandObject(itemChanges);
  // fix this for collection
  mergeObject(contents[idx], itemChanges), {inplace: true, overwrite: true};
  contents[idx] = itemData;
  this.items[idx].data = contents[idx];
  if (this.isOwned) {
    await this.updateParent(contents)
  } else {
    await this.update({"flags.itemcollection.contents": contents});
    const item = Item.createOwned(contents[idx], null);
    item.options.actor = this;
    this.items[idx].item;
  }
}

function _getSpellDC() { return 10; }

/******************** TP ****************** */