import Item5e from "/systems/dnd5e/module/item/entity.js";
import { ItemSheet5eWithBags } from "./ItemSheet5eWithBags.js";
import { ItemSheetShop } from "./ItemSheetShop.js"
let knownSheets = {};
let templates = {};

  // setup all the hooks
function setup(templateSettings) {

  templateSettings.settings().forEach(setting => {
      let options = {
        name: game.i18n.localize(templateSettings.name()+"."+setting.name+'.Name'),
        hint: game.i18n.localize(`${templateSettings.name()}.${setting.name}.Hint`),
        scope: setting.scope,
        config: true,
        default: setting.default,
        type: setting.type
      };
      if (setting.choices) options.choices = setting.choices;
      game.settings.register(templateSettings.name(), setting.name, options);
  });
  Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false, types:["backpack"]});
  Items.registerSheet("dnd5e", ItemSheetShop, {makeDefault: false, types:["backpack"]});

}

Hooks.once("setup", () => { 
  setup(ItemCollectionTemplate);
});

// ********************* TP *************
var oldPrepareData = CONFIG.Item.entityClass.prototype.prepareData;
CONFIG.Item.entityClass.prototype.prepareData = function() {
  // need to set this so we can pretend to be an actor
  setProperty(this.data, "data.attributes.spelldc", 10);
  if (!this.data._id) this.data._id = this.data.id; // a fix for itemcollection owned items
  // prepareEmbeddedItems.bind(this)();
  oldPrepareData.bind(this)();
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

var oldPrepareEmbeddedEntities = CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities;
function _prepareEmbeddedEntities() {
  prepareEmbeddedItems.bind(this)();
  return oldPrepareEmbeddedEntities.bind(this)();
}
CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities = _prepareEmbeddedEntities;

CONFIG.Item.entityClass.prototype.updateParent = async function(contents) {
  if (this.actor.data.flags.itemcollection || this.actor.isToken) {
    this.data.flags.itemcollection.contents = contents;
  }
  await this.actor.updateOwnedItem({"_id": this._id, "flags.itemcollection.contents": contents});
  await this.update({"_id": this._id, "flags.itemcollection.contents": contents})
}

var oldCreateEmbeddedEntity = CONFIG.Item.entityClass.prototype.createEmbeddedEntity;
async function _createEmbeddedEntity(collection, data, options) {
  if (collection === "OwnedItem") {
    this.createOwnedItem(data, options)
  } else {
    return oldCreateEmbeddedEntity.bind(this)(collection, data, options)
  }
}
CONFIG.Item.entityClass.prototype.createEmbeddedEntity = _createEmbeddedEntity

async function _createOwnedItem(itemData, options = {}) {
  if (this.type === "backpack" && this.data.flags.itemcollection) {
    var contents = duplicate(this.data.flags.itemcollection.contents);
    // var contents = this.data.flags.itemcollection.contents;
    itemData._id = contents.length ? Math.max(...contents.map(i => i._id)) + 1 : 1;
    console.log(`ItemCollection | Created item ${itemData._id}`)
    contents.push(itemData);

    if (this.isOwned) {
      await this.updateParent(contents);
    } else {
      await this.setFlag("itemcollection", "contents", contents);
    }
    this.prepareEmbeddedEntities();
    this.prepareData();
    this.render(false);
    return true;
  }
}
CONFIG.Item.entityClass.prototype.createOwnedItem = _createOwnedItem;

var oldDeleteEmbeddedEntity = CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity;
async function _deleteEmbeddedEntity(collection, data, options) {
  if (collection === "OwnedItem") {
    this.deleteOwnedItem(data, options)
  } else {
    return oldDeleteEmbeddedEntity.bind(this)(collection, data, options)
  }
}
CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity = _deleteEmbeddedEntity

CONFIG.Item.entityClass.prototype.deleteOwnedItem = async function(deleted) {
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

var oldUpdateEmbeddedEntity = CONFIG.Item.entityClass.prototype.updateEmbeddedEntity;
async function _updateEmbeddedEntity(collection, data, options) {
  if (collection === "OwnedItem") {
    this.updateOwnedItem(data, options)
  } else {
    return oldUpdateEmbeddedEntity.bind(this)(collection, data, options)
  }
}
CONFIG.Item.entityClass.prototype.updateEmbeddedEntity = _updateEmbeddedEntity;

CONFIG.Item.entityClass.prototype.updateOwnedItem = async function(itemChanges, options) {
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

CONFIG.Item.entityClass.prototype.getSpellDC = function() { return 10}

Hooks.once("setup", () => {
  console.warn("Itemcontainers initialisation")
  CONFIG.Item.entityClass.prototype.updateEmbeddedEntity = oldUpdateEmbeddedEntity;
  oldUpdateEmbeddedEntity = Item5e.prototype.updateEmbeddedEntity;
  Item5e.prototype.updateEmbeddedEntity = _updateEmbeddedEntity;
  CONFIG.Item.entityClass.prototype.createEmbeddedEntity = oldCreateEmbeddedEntity;
  oldCreateEmbeddedEntity = Item5e.prototype.createEmbeddedEntity;
  Item5e.prototype.createEmbeddedEntity = _createEmbeddedEntity;
  CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity = oldDeleteEmbeddedEntity;
  oldDeleteEmbeddedEntity = Item5e.prototype.deleteEmbeddedEntity;
  Item5e.prototype.deleteEmbeddedEntity = _deleteEmbeddedEntity;
})
/******************** TP ****************** */