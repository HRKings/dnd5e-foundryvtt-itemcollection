import { warn, error, debug, i18n } from "../ItemCollection";
import { MODULE_NAME } from "./settings";
import {libWrapper} from './libs/shim.js'
import { getEmbeddedDocument, createEmbeddedDocuments, deleteEmbeddedDocuments, updateEmbeddedDocuments, prepareEmbeddedEntities, getEmbeddedCollection, _onCreateDocuments, calcPrice, calcWeight, containedItemCount, deleteDocuments, getActor, updateDocuments, calcItemWeight, _update, _delete, prepareDerivedData, isEmbedded } from "./ItemContainer";


export let readyHooks = async () => {
  warn("Ready Hooks processing");
  
}

export let initHooks = () => {
  warn("Init Hooks processing");

  // setup all the hooks

}

export let setupHooks = () => {
  warn("Setup Hooks processing");
  libWrapper.ignore_conflicts(MODULE_NAME, "VariantEncumbrance", "CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments")

  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.getEmbeddedDocument", getEmbeddedDocument, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.createEmbeddedDocuments", createEmbeddedDocuments, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.deleteEmbeddedDocuments", deleteEmbeddedDocuments, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments", updateEmbeddedDocuments, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.prepareEmbeddedEntities", prepareEmbeddedEntities, "WRAPPER");
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.getEmbeddedCollection", getEmbeddedCollection, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");

  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.actor", getActor, "OVERRIDE")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.update", _update, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.delete", _delete, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.prototype.isEmbedded", isEmbedded, "OVERRIDE")

  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass._onCreateDocuments", _onCreateDocuments, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.deleteDocuments", deleteDocuments, "MIXED")
  libWrapper.register(MODULE_NAME, "CONFIG.Item.documentClass.updateDocuments", updateDocuments, "MIXED")

  //@ts-ignore documentClass
  CONFIG.Item.documentClass.prototype.calcWeight = calcWeight;
  //@ts-ignore documentClass
  CONFIG.Item.documentClass.prototype.calcItemWeight = calcItemWeight;
  //@ts-ignore documentClass
  CONFIG.Item.documentClass.prototype.calcPrice = calcPrice;
  //@ts-ignore documentClass
  CONFIG.Item.documentClass.prototype.containedItemCount = containedItemCount;

  Hooks.on("preCreateItem", (candidate, data, options, user) => {
    if (!(candidate instanceof Item 
          && candidate.type === "backpack" 
          && data.flags?.itemcollection
          && candidate.data.flags?.itemcollection?.verion !== "0.8.6")) 
        return true;
    if (data.flags.itemcollection?.contents && data.flags.itemcollection?.version !== "0.8.6") { // old version to convert
      const itemcollectionData = {
        contentsData: duplicate(data.flags.itemcollection.contents || []), 
        version: "0.8.6", 
        bagWeight: data.flags.itemcollection?.fixedWeight ?? 0, 
        bagPrice: data.data.price ?? 0
      };
      itemcollectionData.contentsData.forEach(itemData => {
        itemData._id = randomID();
        (itemData.effects ?? []).forEach(effectData => {
          effectData.origin = undefined;
        })
        if (itemData.type === "backpack") fixupItemData(itemData);
      })
      candidate.data.update({
        "flags.itemcollection.-=contents": null,
        "flags.itemcollection.-=goldValue": null,
        "flags.itemcollection.-=fixedWeight": null,
        "flags.itemcollection.-=importSpells": null,
        "flags.itemcollection.-=itemWeight": null
      });
      candidate.data.update({"flags.itemcollection": itemcollectionData});

    }
  });

  Hooks.on("updateItem", (item, updates, options, user) => {
  });

}

export function fixupItemData(itemData) {
  if (!itemData.flags.itemcollection || itemData.flags.itemcollection.version === "0.8.6") return;
  let itemcontents = duplicate(itemData.flags.itemcollection.contents || []);
  for (let iidata of itemcontents) {
    iidata._id = randomID();
    (iidata.effects ?? []).forEach(effectData => {
      effectData.origin = undefined;
    });
    if (iidata.type === "backpack") fixupItemData(iidata);
  }
  itemData.flags.itemcollection.version = "0.8.6";
  itemData.flags.itemcollection.bagWeight = itemData.flags.itemcollection?.fixedWeight ?? 0;
  itemData.flags.itemcollection.bagPrice = itemData.data.price ?? 0;
  itemData.flags.itemcollection.contentsData = itemcontents;
  delete itemData.flags.itemcollection.contents
  delete itemData.flags.itemcollection.goldValue;
  delete itemData.flags.itemcollection.fixedWeight;
  delete itemData.flags.itemcollection.importSpells;
  delete itemData.flags.itemcollection.itemWeight;
}
