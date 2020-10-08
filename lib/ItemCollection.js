import { DND5E } from "/systems/dnd5e/module/config.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
import ItemSheet5e from "/systems/dnd5e/module/item/sheet.js";
import { ItemSheet5eWithBags } from "/modules/itemcollection/lib/ItemSheet5eWithBags.js";
import { ItemSheetShop } from "/modules/itemcollection/lib/ItemSheetShop.js"
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
const oldPrepareData = Item.prototype.prepareData;
Item.prototype.prepareData = function() {
  // need to set this so we can pretend to be an actor
  setProperty(this.data, "data.attributes.spelldc", 10);
  if (!this.data._id) this.data._id = this.data.id; // a fix for itemcollection owned items
  this.prepareEmbeddedEntities()
  oldPrepareData.bind(this)();
}

Item.prototype.prepareEmbeddedEntities = function() {
  if (hasProperty(this, "data.flags.itemcollection.contents")) {
    const existing = (this.items || []).reduce((obj, i) => {
      obj[i.id] = i;
      return obj;
    }, {});

    // Prepare the new Item index
    const items = this.data.flags.itemcollection.contents.map(i => {
      if ( i._id in existing ) {
        const item = existing[i._id];
        item.data = i;
        item.prepareData();
        return item;
      }
      else return Item.createOwned(i, this);
    });
    this.items = items;
  }
  /*
  if (hasProperty(this, "data.flags.itemcollection.contents")) {
    console.log("prepare embedded entities")
    this.items = this.data.flags.itemcollection.contents.map(i => console.log(i));

    this.items = this.data.flags.itemcollection.contents.map(i => Item.createOwned(i, this));
  }*/
}


Item.prototype.updateParent = async function(contents) {
  if (this.actor.data.flags.itemcollection || this.actor.isToken) {
    this.data.flags.itemcollection.contents = contents;
  }
  await this.actor.updateOwnedItem({"_id": this._id, "flags.itemcollection.contents": contents});
  await this.update({"_id": this._id, "flags.itemcollection.contents": contents})
}

Item.prototype.createOwnedItem = async function(itemData, options = {}) {
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
Item.prototype.deleteOwnedItem = async function(deleted) {
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

Item.prototype.updateOwnedItem = async function(itemChanges, options) {
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
    this.items[idx].prepareData();
  }
}

Item.prototype.getSpellDC = function() { return 10}


/******************** TP ****************** */