export const Itemcollection = {
  async convertToBackpack(itemName) {
      let item = game.items.entities.find(i=>i.name === itemName);
      if (!item) {
          ui.notifications.error(`Could not find ${itemName}`);
          return;
      }
      let capacity = {type: "weight", value: 0, weightless: false};
      let currency = {pp: 0, gp: 0, ep: 0, sp: 0, cp: 0};
      await item.update({
        "_id": item._id, 
        "type": "backpack", 
        "data.capacity": capacity, 
        "data.currency": currency
      });
      const sheet = item.sheet;
      if (item.sheet){
         await sheet.close();
      }
      //item.sheet = null;
      delete item.apps[sheet.appId];
  
      // Update the Entity-specific override
      //  await item.setFlag("core", "sheetClass", "dnd5e.ItemSheet5eWithBags");
    }
}


const spellbookData = "{\"_id\":\"OQU13yuxA8yo5gCJ\",\"name\":\"Spellbook IC\",\"type\":\"backpack\",\"img\":\"systems/dnd5e/icons/items/inventory/book-purple.jpg\",\"data\":{\"description\":{\"value\":\"<p><span style=\\\"color: #191813; font-size: 13px;\\\">Essential for wizards, a spellbook is a leather-bound tome with 100 blank vellum pages suitable for recording spells.</span></p>\",\"chat\":\"\",\"unidentified\":\"\",\"type\":\"String\",\"label\":\"Description\"},\"source\":\"\",\"quantity\":1,\"weight\":3,\"price\":50,\"attunement\":0,\"equipped\":false,\"rarity\":\"common\",\"identified\":true,\"capacity\":{\"type\":\"weight\",\"value\":0,\"weightless\":true},\"currency\":{\"cp\":0,\"sp\":0,\"ep\":0,\"gp\":0,\"pp\":0}},\"effects\":[],\"folder\":\"3GwtOCdI8TJfIwxM\",\"sort\":0,\"permission\":{\"default\":0,\"g4WGw0lAZ3nIhapn\":3},\"flags\":{\"_sheetTab\":\"details\",\"itemcollection\":{\"version\":\"0.8.6\",\"bagWeight\":3,\"bagPrice\":50,\"contentsData\":[]},\"core\":{\"sheetClass\":\"dnd5e.ItemSheet5eWithBags\",\"sourceId\":\"Compendium.itemcollection.packs.jUTpEHQg0psJKHbF\"},\"magicitems\":{\"enabled\":false,\"equipped\":false,\"attuned\":false,\"charges\":\"0\",\"chargeType\":\"c1\",\"destroy\":false,\"destroyFlavorText\":\"reaches 0 charges: it crumbles into ashes and is destroyed.\",\"rechargeable\":false,\"recharge\":\"0\",\"rechargeType\":\"t1\",\"rechargeUnit\":\"r1\",\"sorting\":\"l\"}}}"

export async function createSpellBookFromActor(actor) {
  const spellBookJson = JSON.parse(spellbookData);
  spellBookJson.name = `${game.i18n.localize("DND5E.Spellbook")} - ${actor.name}`;
  const itemsData = actor.items.filter(i=>i.type === "spell").map(i=>i.data);
  //@ts-ignore
  const theItem = await CONFIG.Item.documentClass.create(spellBookJson);
  return theItem.createEmbeddedDocuments("Item", itemsData);
}