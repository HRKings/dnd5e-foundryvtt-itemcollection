/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */
// Import JavaScript modules
// //@ts-ignore
// import { DND5E } from '../../systems/dnd5e/module/config.js';
// //@ts-ignore
// import { ActorSheet5e  } from '../../systems/dnd5e/module/actor/sheets/base.js';
// //@ts-ignore
// import { ActorSheet5eCharacter  } from '../../systems/dnd5e/module/actor/sheets/character.js';
// //@ts-ignore
// import { Item5e } from '../../systems/dnd5e/module/item/entity.js';

// Import TypeScript modules
import { MODULE_NAME, registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ItemSheet5eWithBags } from './module/ItemSheet5eWithBags.js';
import { ItemSheetShop } from './module/ItemSheetShop.js';
import { initHooks, readyHooks, setupHooks } from './module/Hooks';
// import { installedModules, setupModules } from './module/setupModules';
import {libWrapper} from './module/libs/shim.js'

export let debugEnabled = 0;
// 0 = none, warnings = 1, debug = 2, all = 3
export let debug = (...args) => {if (debugEnabled > 1) console.log(`DEBUG:${MODULE_NAME} | `, ...args)};
export let log = (...args) => console.log(`${MODULE_NAME} | `, ...args);
export let warn = (...args) => {if (debugEnabled > 0) console.warn(`${MODULE_NAME} | `, ...args)};
export let error = (...args) => console.error(`${MODULE_NAME} | `, ...args);
export let timelog = (...args) => warn(`${MODULE_NAME} | `, Date.now(), ...args);

export let i18n = key => {
  return game.i18n.localize(key);
};
export let i18nFormat = (key, data = {}) => {
  return game.i18n.format(key, data);
}

export let setDebugLevel = (debugText: string) => {
  debugEnabled = {"none": 0, "warn": 1, "debug": 2, "all": 3}[debugText] || 0;
  // 0 = none, warnings = 1, debug = 2, all = 3
  if (debugEnabled >= 3) CONFIG.debug.hooks = true;
}

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async () => {
	console.log(`${MODULE_NAME} | Initializing ${MODULE_NAME}`);

	// Register custom module settings
	registerSettings();

	initHooks();
	// Assign custom classes and constants here

	// Register custom module settings
	//registerSettings();
	//fetchParams();

	// Preload Handlebars templates
	await preloadTemplates();
	// Register custom sheets (if any)

});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
	// Do anything after initialization but before ready
	// setupModules();

	registerSettings();

  // setup(ItemCollectionTemplate);
  //@ts-ignore
  Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false, types:["backpack"]});
  //@ts-ignore
	Items.registerSheet("dnd5e", ItemSheetShop, { makeDefault: false, types:["backpack"]});

  setupHooks();

});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', () => {

	// Do anything once the module is ready
	if (!game.modules.get("lib-wrapper")?.active && game.user.isGM){
   	ui.notifications.error(`The '${MODULE_NAME}' module requires to install and activate the 'libWrapper' module.`);
		return;
	}

	readyHooks();
});

// Add any additional hooks if necessary

// let knownSheets = {};
// let templates = {};

  // setup all the hooks
// function setup(templateSettings) {

//   templateSettings.settings().forEach(setting => {
//       let options:ClientSettings.PartialSetting = {
//         name: i18n(`${templateSettings.name()}.${setting.name}.Name`),
//         hint: i18n(`${templateSettings.name()}.${setting.name}.Hint`),
//         scope: setting.scope,
//         config: true,
//         default: setting.default,
//         type: setting.type
//       };
//       if (setting.choices) {
//         options.choices = setting.choices;
//       }
//       game.settings.register(templateSettings.name(), setting.name, options);
//   });
//   Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false, types:["backpack"]});
//   Items.registerSheet("dnd5e", ItemSheetShop, {makeDefault: false, types:["backpack"]});

// }

// Hooks.once("setup", () => { 
//   setup(ItemCollectionTemplate);
// });

// ********************* TP *************
// function _prepareData(wrapped, ...args) {
//   // need to set this so we can pretend to be an actor
//   setProperty(this.data, "data.attributes.spelldc", 10);
//   if (!this.data._id) this.data._id = this.data.id; // a fix for itemcollection owned items
//   // prepareEmbeddedItems.call(this);
//   return wrapped(...args);
// }

// function prepareEmbeddedItems() {
//     if (hasProperty(this, "data.flags.itemcollection.contents")) {
//       const existing = (this.items || []).reduce((obj, i) => {
//         obj[i.id] = i;
//         return obj;
//       }, {});
  
//       // Prepare the new Item index
//       const items = this.data.flags.itemcollection.contents.map(i => {
//           const item = Item.createOwned(i, null);
//           item.options.actor = this;
//           return item;
//       });
//       this.items = items;
//     }
// }

// function _prepareEmbeddedEntities(wrapped, ...args) {
//   prepareEmbeddedItems.call(this);
//   return wrapped(...args);
// }

// async function _updateParent(contents) {
//   if (this.actor.data.flags.itemcollection || this.actor.isToken) {
//     this.data.flags.itemcollection.contents = contents;
//   }
//   await this.actor.updateOwnedItem({"_id": this._id, "flags.itemcollection.contents": contents});
//   await this.update({"_id": this._id, "flags.itemcollection.contents": contents})
// }

// async function _createEmbeddedEntity(wrapped, ...args) {
//   const [ collection, data, options ] = args;
//   if (collection === "OwnedItem") {
//     await this.createOwnedItem(data, options)
//   } else {
//     return await wrapped(...args);
//   }
// }

// async function _createOwnedItem(itemData, options = {}) {
//   if (this.type === "backpack" && this.data.flags.itemcollection) {
//     var contents = duplicate(this.data.flags.itemcollection.contents);
//     // var contents = this.data.flags.itemcollection.contents;
//     itemData._id = contents.length ? Math.max(...contents.map(i => i._id)) + 1 : 1;
//     console.log(`${MODULE_NAME} | Created item ${itemData._id}`)
//     contents.push(itemData);

//     if (this.isOwned) {
//       await this.updateParent(contents);
//     } else {
//       await this.setFlag(MODULE_NAME, "contents", contents);
//     }
//     this.prepareEmbeddedEntities();
//     this.prepareData();
//     this.render(false);
//     return true;
//   }
// }

// async function _deleteEmbeddedEntity(wrapped, ...args) {
//   const [ collection, data, options ] = args;
//   if (collection === "OwnedItem") {
//     await this.deleteOwnedItem(data, options)
//   } else {
//     return await wrapped(...args);
//   }
// }

// async function _deleteOwnedItem(deleted) {
//   let contents = duplicate(this.data.flags.itemcollection.contents);
//   // let contents = this.data.flags.itemcollection.contents;
//   if (!contents) return;
//   let idx = contents.findIndex(o => o._id === deleted || Number(o._id) === deleted);
//   if (idx === -1) throw new Error(`OwnedItem ${deleted} not found in Bag ${this._id}`);
//   contents.splice(idx,1);
//   console.log(`ItemCollection | Deleted Item ${deleted} from bag ${this._id}`);
//   if (this.isOwned) {
//     await this.updateParent(contents);
//    } else {
//      await this.update({"flags.itemcollection.contents": contents});
//    }
//    this.prepareEmbeddedEntities()
// }

// async function _updateEmbeddedEntity(wrapped, ...args) {
//   const [ collection, data, options ] = args;
//   if (collection === "OwnedItem") {
//     await this.updateOwnedItem(data, options)
//   } else {
//     return await wrapped(...args);
//   }
// }

// async function _updateOwnedItem(itemChanges, options) {
//   let contents = duplicate(this.data.flags.itemcollection.contents);
//   // let contents = this.data.flags.itemcollection.contents;
//   if (!contents) return;
//   let idx = contents.findIndex(o => o._id === itemChanges._id);
//   if (idx === -1) throw new Error(`OwnedItem ${itemChanges._id} not found in Bag ${this._id}`);
//   let itemData = contents[idx];
//   itemChanges = expandObject(itemChanges);
//   // fix this for collection
//   mergeObject(contents[idx], itemChanges), {inplace: true, overwrite: true};
//   contents[idx] = itemData;
//   this.items[idx].data = contents[idx];
//   if (this.isOwned) {
//     await this.updateParent(contents)
//   } else {
//     await this.update({"flags.itemcollection.contents": contents});
//     const item = Item.createOwned(contents[idx], null);
//     item.options.actor = this;
//     this.items[idx].item;
//   }
// }

// function _getSpellDC() { return 10; }

// Hooks.once("ready", () => {
//   if (!game.modules.get("lib-wrapper")?.active && game.user.isGM)
//       ui.notifications.warn("The 'Item Containers' module recommends to install and activate the 'libWrapper' module.");
// });

// Hooks.once("setup", () => {
//   console.warn("Itemcontainers initialisation");

//   if (game.modules.get("lib-wrapper")?.active) {
//     libWrapper.register("itemcollection", "CONFIG.Item.entityClass.prototype.prepareData", _prepareData, "WRAPPER");
//     libWrapper.register("itemcollection", "CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities", _prepareEmbeddedEntities, "WRAPPER");
//     libWrapper.register("itemcollection", "CONFIG.Item.entityClass.prototype.createEmbeddedEntity", _createEmbeddedEntity, "MIXED");
//     libWrapper.register("itemcollection", "CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity", _deleteEmbeddedEntity, "MIXED");
//     libWrapper.register("itemcollection", "CONFIG.Item.entityClass.prototype.updateEmbeddedEntity", _updateEmbeddedEntity, "MIXED");
//   } else {
//     const oldPrepareData = CONFIG.Item.entityClass.prototype.prepareData;
//     CONFIG.Item.entityClass.prototype.prepareData = function () {
//       return _prepareData.call(this, oldPrepareData.bind(this), ...arguments);
//     };

//     const oldPrepareEmbeddedEntities = CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities;
//     CONFIG.Item.entityClass.prototype.prepareEmbeddedEntities = function () {
//       return _prepareEmbeddedEntities.call(this, oldPrepareEmbeddedEntities.bind(this), ...arguments);
//     };

//     const oldCreateEmbeddedEntity = CONFIG.Item.entityClass.prototype.createEmbeddedEntity;
//     CONFIG.Item.entityClass.prototype.createEmbeddedEntity = function () {
//       return _createEmbeddedEntity.call(this, oldCreateEmbeddedEntity.bind(this), ...arguments);
//     };

//     const oldDeleteEmbeddedEntity = CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity;
//     CONFIG.Item.entityClass.prototype.deleteEmbeddedEntity = function () {
//       return _deleteEmbeddedEntity.call(this, oldDeleteEmbeddedEntity.bind(this), ...arguments);
//     };

//     const oldUpdateEmbeddedEntity = CONFIG.Item.entityClass.prototype.updateEmbeddedEntity;
//     CONFIG.Item.entityClass.prototype.updateEmbeddedEntity = function () {
//       return _updateEmbeddedEntity.call(this, oldUpdateEmbeddedEntity.bind(this), ...arguments);
//     };
//   }

//   console.assert(CONFIG.Item.entityClass.prototype.updateParent === undefined);
//   CONFIG.Item.entityClass.prototype.updateParent = _updateParent;

//   console.assert(CONFIG.Item.entityClass.prototype.createOwnedItem === undefined);
//   CONFIG.Item.entityClass.prototype.createOwnedItem = _createOwnedItem;

//   console.assert(CONFIG.Item.entityClass.prototype.deleteOwnedItem === undefined);
//   CONFIG.Item.entityClass.prototype.deleteOwnedItem = _deleteOwnedItem;

//   console.assert(CONFIG.Item.entityClass.prototype.updateOwnedItem === undefined);
//   CONFIG.Item.entityClass.prototype.updateOwnedItem = _updateOwnedItem;

//   console.assert(CONFIG.Item.entityClass.prototype.getSpellDC === undefined);
//   CONFIG.Item.entityClass.prototype.getSpellDC = _getSpellDC;
// })
/******************** TP ****************** */
