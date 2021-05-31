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
import { fixupItemData, initHooks, readyHooks, setupHooks } from './module/Hooks';
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

  // Preload Handlebars templates
	await preloadTemplates();


});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
	// Do anything after initialization but before ready
  //@ts-ignore
  Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false, types:["backpack"]});
  //@ts-ignore
	Items.registerSheet("dnd5e", ItemSheetShop, { makeDefault: false, types:["backpack"]});

  setupHooks();


});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', async () => {
	// Do anything once the module is ready
	if (!game.modules.get("lib-wrapper")?.active && game.user.isGM){
   	ui.notifications.error(`The '${MODULE_NAME}' module requires to install and activate the 'libWrapper' module.`);
		return;
	}
	readyHooks();
  //@ts-ignore
  window.Itemcollection = {
    migrateItems,
    migrateActorItems,
    migrateAllActorItems,
    migrateAllTokenItems,
    migrateAllItems,
    migrateWorld
  }
});

export async function migrateItems(items, name = "") {
  let promises = [];
  for (let item of items) {
    if (item.type === "backpack" 
        && item.data.flags?.itemcollection 
        && item.data.flags?.itemcollection?.version !== "0.8.6") {
      console.error(`Migrating ${name}: Item ${item.name}`)
      let itemcontents = duplicate(item.data.flags?.itemcollection?.contents || []);
      for (let itemData of itemcontents) {
        if (itemData.type === "backpack") fixupItemData(itemData);
        (itemData.effects ?? []).forEach(effectData => {
          effectData.origin = undefined;
        })
        itemData._id = randomID();
      }
      promises.push(item.update({
        "flags.itemcollection.version": "0.8.6",
        "flags.itemcollection.bagWeight": item.data.flags.itemcollection?.fixedWeight ?? 0,
        "flags.itemcollection.bagPrice": item.data.data.price,
        "flags.itemcollection.contentsData": itemcontents,
        "flags.itemcollection.-=contents": null,
        "flags.itemcollection.-=goldValue": null,
        "flags.itemcollection.-=fixedWeight": null,
        "flags.itemcollection.-=importSpells": null
      }));
      // promises.push(item.update({"flags.itemcollection.-=contents": null, "flags.itemcollection.-=fixedWeight": null}));
    }
  }
  return Promise.all(promises);
}

async function migrateActorItems(actor) {
  if (!(actor instanceof Actor)) {
    console.error(actor, " is not an actor");
    return;
  }
  return migrateItems(actor.items, actor.name);
}

async function migrateAllActorItems() {
  let promises = [];
  for (let actor of game.actors) {
    promises.push(migrateActorItems(actor));
  }
  return Promise.all(promises);
}

async function migrateAllTokenItems() {
  let promises = [];
  for (let scene of game.scenes) {
    for (let tokenDocument of scene.tokens) {
      if (!tokenDocument.isLinked && tokenDocument.actor) {
        promises.push(migrateActorItems(tokenDocument.actor))
      }
    }
  }
  return Promise.all(promises);
}

async function migrateAllItems() {
  return migrateItems(game.items, "World");
}

async function migrateWorld() {
  Promise.all([migrateAllItems(), migrateAllActorItems(), migrateAllTokenItems()]);
}