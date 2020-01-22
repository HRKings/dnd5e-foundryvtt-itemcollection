Itemcollection = {
async convertToBackpack(itemName) {
    let item = game.items.entities.find(i=>i.name === itemName);
    if (!item) {
        ui.notifications.error(`Could not find ${itemName}`);
        return;
    }
    let capacity = {type: "weight", value: 0, weightless: false};
    let currency = {pp: 0, gp: 0, ep: 0, sp: 0, cp: 0};
    await item.update({"_id": item._id, "type": "backpack", "data.capacity": capacity, "data.currency": currency});
    const sheet = item.sheet;
    if (item.sheet) await sheet.close();
    item._sheet = null;
    delete item.apps[sheet.appId];

    // Update the Entity-specific override
    //  await item.setFlag("core", "sheetClass", "dnd5e.ItemSheet5eWithBags");
  }

}