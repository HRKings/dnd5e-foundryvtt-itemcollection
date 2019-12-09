import { DND5E } from "/systems/dnd5e/module/config.js";
import { Item5e } from "/systems/dnd5e/module/item/entity.js";
import { ItemSheet5e } from "/systems/dnd5e/module/item/sheet.js";
import { migrateItemData } from "/systems/dnd5e/module/migration.js";

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
  Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false});
}

export class ItemSheet5eWithBags extends ItemSheet5e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      width: 570,
      height: 500,
      showUnpreparedSpells: true
    });
    return options;
  }

  get template() {
    return  "modules/itemcollection/templates/bag-sheet.html";
  }

  migrateItem = function(itemData) {

    // let newData = {"data": {}};
    let migrateData = migrateItemData(itemData);

    if (itemData.type === "spell") {
      migrateData["data.preparation.mode"] = "prepared";
      migrateData["data.preparation.prepared"] = itemData.prepared ? Boolean(itemData.prepared.value) : false;
      migrateData["data.-=prepared"] = null;
      migrateData["data.components.ritual"] = itemData.data.ritual.value;
      migrateData["data.-=ritual"] = null;
      migrateData["data.-=time"] = null;
      migrateData["data.-=spellType"] = null;
    }
    let newData = mergeObject(duplicate(itemData), migrateData);

    let itemFlags = itemData.flags.itemcollection;

    if (itemFlags) {
      newData.flags.itemcollection = {};

      let equiped = getProperty(itemData.flags, "itemcollection.equipped.value") || false;
      let currency = duplicate(getProperty(itemData.flags, "itemcollection.currency") || {});
      let capacity = getProperty(itemData.flags, "itemcollection.capacity.value") || 0;
      let newFlags = newData.flags.itemcollection;
      newData.type = "backpack";
      newFlags.version = 0.4;

      setProperty(newData.data, "capacity.type", "weight");
      setProperty(newData.data, "capacity.value", capacity);
      setProperty(newFlags, "fixedWeight", getProperty(itemFlags, "fixedWeight.value") || 0);
      setProperty(newData.data, "currency.pp", getProperty(currency, "pp.value") || 0);
      setProperty(newData.data, "currency.gp", getProperty(currency, "gp.value") || 0);
      setProperty(newData.data, "currency.ep", getProperty(currency, "ep.value") || 0);
      setProperty(newData.data, "currency.sp", getProperty(currency, "sp.value") || 0);
      setProperty(newData.data, "currency.cp", getProperty(currency, "cp.value") || 0);
      newFlags.goldValue = 0;
      newFlags.itemWeight = 0;
      newFlags.importSpells = itemFlags.importSpells ? itemFlags.importSpells.value : false;
      if (itemFlags.contents) {
        newFlags.contents = [];
        for (let i = 0; i < itemFlags.contents.length; i++) {
          newFlags.contents.push(this.migrateItem(itemFlags.contents[i]));
          newFlags.contents[i].id = itemFlags.contents[i].id;
        }
      }
    } else {
      if (newData.type === "backpack") newData.type = "loot";
    }
    console.log(`Migrated item ${newData.name}`);
    return newData
  }

  render(...args) {
    console.log("Inside render ********************** ");
    super.render(...args);
  }

  async getData() {
    const type = this.object.data.type;
    if (type !== "backpack") {
      return super.getData();
    };
    console.log("IN Get Data ****************************8 ")
    this._sheetTab="details"
    if (!hasProperty(this.object.data, "flags.itemcollection.version") || getProperty(this.object.data, "flags.itemcollection.version") < 0.4) {
      // assume version 0.3.9 or earlier
      let itemData = await this.migrateItem(this.object.data);
      let objectId = this.object.data.id;
      setProperty(itemData, "flags.itemcollection.version",  0.4) ;
      // check for owned item
      itemData.id = objectId;
      await this.object.update(itemData);
      await this.object.unsetFlag("itemcollection", "capacity");
      await this.object.unsetFlag("itemcollection", "equipped");
      await this.object.unsetFlag("itemcollection", "currency");
    }
    const item = this.object;
    var data = super.getData();
    data.flags = item.data.flags

    if (!hasProperty(data.flags, "itemcollection.itemWeight"))
      setProperty(data.flags, "itemcollection.itemWeight", 0);
    if (!hasProperty(data.flags, "itemcollection.fixedWeight"))
      setProperty(data.flags,"itemcollection.fixedWeight", 0);
    if (!hasProperty(data.flags, "itemcollection.goldValue"))
      setProperty(data.flags,"itemcollection.goldValue",  0);
    if (!hasProperty(data.flags, "itemcollection.contents"))
      setProperty(data.flags,"itemcollection.contents", []);
    if (!hasProperty(data.flags, "itemcollection.importSpells"))
      setProperty(data.flags,"itemcollection.importSpells", false);

    this.options.editable = this.options.editable && (!this.object.actor || !this.object.actor.token);
    data.hasDetails = true;
    if (game.settings.get("itemcollection", "sortBagContents")) {
      data.flags.itemcollection.contents.sort((a,b) => {
        if (a.type !== b.type) return (a.type < b.type ? -1 : 1);
        if (a.type !== "spell") return (a.name < b.name ? -1 : 1);
        if (a.data.level !== b.data.level) return (a.data.level - b.data.level);
        return a.name < b.name ? -1 : 1;
      });
    }
//      data.flags = duplicate(this.object.data.flags);
    data.isGM = game.user.isGM;
    data.isOwned = !!this.object.actor;
    data.isEquipped = data.data.equipped;
    data.canConvertToGold = game.settings.get('itemcollection', 'goldConversion');
    data.data.owned = !!this.object.actor;
    data.allowBulkOperations = !this.object.actor || !this.object.actor.isToken;
    data.canEdit = this.options.editable;


    let totalGoldValue = this.calcBagGoldValue();
    //TODO check this out
    for (let i of data.flags.itemcollection.contents){
      // i.selected = false;
      // i.owned = !!this.object.actor;
      i.totalWeight = this._calcItemWeight(i);
    }
    data.flags.itemcollection.goldValue = totalGoldValue;
    data.data.weight = this.calcBagWeight();
    data.flags.itemcollection.itemWeight = this.calcContentsWeight();
    return data;
  }

  _calcItemWeight(itemData) {
    let quantity = itemData.data.quantity || 1;
    let weight = itemData.data.weight || 0;
    return weight * quantity;
  }

  _calcItemPrice(itemData) {
    let quantity = (itemData.data.quantity) || 1;
    let price = (itemData.data.price) || 0;
    if (typeof price === "string") { // try to remove GP from the string
      price= price.replace(/[^\d]+/g, "");;
      price = Number(price);
    }
    return price * quantity;
  }

  _getWeightChangeString() {
  }

  async updateWeight() {
    let oldWeight = this.object.data.data.weight;
    let oldItemWeight = this.object.getFlag("itemcollection", "itemWeight");
    let totalWeight = this.calcBagWeight();
    let itemWeight = this.calcContentsWeight();
    this.object.data.data.weight = totalWeight;
    // this.object.data.flags.itemcollection.itemWeight = bagWeight;
    if (oldItemWeight !== itemWeight) await this.object.setFlag("itemcollection", "itemWeight", itemWeight);
    if (this.object.actor && oldWeight !== totalWeight) await this.object.actor.updateOwnedItem(duplicate(this.object.data));
  }

  async updateOwnedItem(itemChanges, options) {
    let contents = this.object.data.flags.itemcollection.contents;
    let idx = contents.findIndex(o => o.id === itemChanges.id);
    if (idx === -1) throw new Error(`OwnedItem ${itemChanges.id} not found in Bag ${this.object.data.id}`);
    let itemData = contents[idx];
    mergeObject(itemData, itemChanges), {inplace: true};
    await this.object.setFlag("itemcollection", "contents", duplicate(contents));
  }

  calcBagGoldValue() {
    let totalItemValue = this.object.getFlag("itemcollection", "contents").reduce((val, item) => val += this._calcItemPrice(item), 0)
    const currency = this.object.data.data.currency;
    let coinValue =currency ?  Object.keys(currency).reduce((val, denom) =>
                         val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom], 0) : 0;
    return Math.round(totalItemValue + coinValue);
  }

  calcContentsWeight () {
    let weight = this.object.getFlag("itemcollection", "contents").reduce((val, itemData) => val += this._calcItemWeight(itemData), 0);
    // Add Currency Weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      const currency = this.object.data.data.currency;
      const numCoins = currency ? Object.values(currency).reduce((val, denom) => val += denom, 0) : 0;
      weight = Math.round((weight + (numCoins / 50)) * 10) / 10;
    }
    return weight;
  }

  calcBagWeight() {
    const equipped = this.object.data.data.equipped;
    const isFixed = this.object.data.data.capacity.weightless;
    return !equipped ? 0 : this.object.getFlag("itemcollection", "fixedWeight") + (isFixed ? 0 : this.calcContentsWeight())
  }

  async _onDragItemStart(event) {
    const items = this.object.getFlag("itemcollection", "contents");
    const itemId = Number(event.currentTarget.dataset.itemId);
    let item = items.find(i => i.id === Number(itemId));
    item = duplicate(item);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      data: item
    }));
    await this.deleteOwnedItem(itemId);
    //this.render(false);
  }

  async deleteAllOwnedItems() { // does not push updates
    await this.object.setFlag("itemcollection", "contents", []);
    this.updateWeight();
  }

  async deleteOwnedItem(deleted) {
    let contents = duplicate(this.object.data.flags.itemcollection.contents);
    let idx = contents.findIndex(o => o.id === deleted);
    if (idx === -1) throw new Error(`OwnedItem ${deleted} not found in Bag ${this.object.data._id}`);
    contents.splice(idx,1);
    console.log(`itemcollection | Deleted Item ${deleted} from bag ${this.object.data.id}`);
    
    await this.object.setFlag("itemcollection", "contents", contents);
    await this.updateWeight();
    if (this.object.actor) this.object.actor.updateOwnedItem(this.object.data);
    this.render(false);
  }

  async _addManyBagItems(items) {
    let contents = this.object.data.flags.itemcollection.contents;
    let newItemId = contents.length ? Math.max(...items.map(i => i.data.id)) + 1 : 1;
    for (let i = 0; i < items.length; i++) {
      items[i].data.id = newItemId;
      newItemId += 1;
      contents.push(items[i]);
    }
    this.updateWeight();
    await this.object.setFlag("itemcollection", "contents", contents);
  }

  async createOwnedItem(itemData, options) {
//      if (!this.canAdd(item)) return false;
    var items = this.object.data.flags.itemcollection.contents;
    itemData.id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
    delete itemData._id
    items.push(itemData);
    await this.object.setFlag("itemcollection", "contents", duplicate(items));
    await this.updateWeight();
    this.render(false);
    return true;
  }

  canAdd(itemData) {
    // Check that the item is not too heavy for the bag.
    let bagCapacity = this.object.data.data.capacity.value;
    if (bagCapacity === 0) return true;
    if (this.object.data.data.capacity.type === "items") {
      let itemCount = this.object.data.flags.itemcollection.contents.reduce((val, itemData) => itemData.data.quantity + val, 0);
      return itemCount + itemData.data.quantity <= bagCapacity;
    }
    let newWeight = this._calcItemWeight(itemData);
    let contentsWeight = Number(this.object.getFlag("itemcollection", "itemWeight"));
    return bagCapacity >= contentsWeight + newWeight;
  }

  async _onDrop(event) {

    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ( data.type !== "Item" ) {
        console.log("itemcollection | Bags only accept items");
        return false;
      }
    }
    catch (err) {
      console.log(event.dataTransfer.getData('text/plain'));
      console.log(err);
      return false;
    }

    // Case 1 - Data explicitly provided
    if ( data.data ) {

      if ((this.object.actor && data.actorId === this.object.actor.id) && data.data.id === this.object.data.id) {
        console.log("itemcollection | Cant drop on yourself");
        ui.notifications.info(game.i18n.localize('itemcollection.ExtradimensionalVortex'));
        throw new Error("Dragging bag onto istelf opens a planar vortex and you are sucked into it")
      }
      // We do't have the source actor. Only allow the drop from the same actor. *** TO DO ****
      // drop from player characters or another bag.
      let actor = (data.actorId) ? game.actors.get(data.actorId) : undefined;
      if (this.canAdd(data.data)) {
          // will fit in the bag so add it to the bag and delete from the owning actor if there is one.
          let toDelete = data.data.id;
          await this.createOwnedItem(data.data), {};
          if (actor && actor.data.type === "character") await actor.deleteOwnedItem(toDelete);
          return false;
      }
      // Item will not fit in the bag what to do?
      if (this.object.actor) { // this bag is owned by an actor - drop into the inventory instead.
          let myActor = game.actors.get(this.object.actor.data._id);
          await this.object.actor.createOwnedItem(data.data, {});
          ui.notifications.info(game.i18n.localize('itemcollection.AlternateDropInInventory'));
          if (actor && actor.data.type === "character") await actor.deleteOwnedItem(data.data.id) ;
          return false;
      }

      // Last resort accept the drop anyway so that the item wont disappear.
      if (!actor) await this.createOwnedItem(data.data, {}); 
    }

    // Case 2 - Import from a Compendium pack
    else if ( data.pack ) {
      this._importItemFromCollection(data.pack, data.id);
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      if (this.canAdd(item.data)) { // item will fit in the bag
        this.createOwnedItem(duplicate(item.data), {});
      } else {
        console.log(`itemcolleciton | no room in bag for dropped item`);
        ui.notifications.info(game.i18n.localize('itemcollection.NoRoomInBag'));
      }
    }
    return false;
  }

  async _importItemFromCollection(collection, entryId) {
    const pack = game.packs.find(p => p.collection === collection);
    if ( pack.metadata.entity !== "Item" && pack.metadata.entity !== "Spell") return;
    return pack.getEntity(entryId).then(ent => {
      delete ent.data._id;
      if (this.canAdd(ent.data)) {
        console.log(`itemcollection | Importing Item ${ent.name} from ${collection}`);
        this.createOwnedItem(ent.data, {});
      } else {
        console.log(`itemcolleciton | no room in bag for dropped item`);
        ui.notifications.info(game.i18n.localize('itemcollection.NoRoomInBag'));
      }
    });
  }

  async _importAllItemsFromActor() {
    if (!this.object.data.flags.itemcollection) return; // has to be a bag
    if (!this.object.actor) return;
    const items = this.object.getFlag("itemcollection", "contents");
    let allOwnedItems = this.object.actor.items;
    let count = 0;
    let weight = this.calcBagWeight();
    let capacity = this.object.data.data.capacity.value;
    let newOwnedItems = [];
    let newItems = [];
    for (let item of allOwnedItems) {
      let itemData = hasProperty(item, "type") ? item : item.data;
      if ( (itemData.id !== this.object.data.id)   // don't import the bag itself
          && (["weapon", "equipment", "consumable", "tools", "spell", "loot"].includes(itemData.type)) // is it of the right type ?
          && (itemData.type === "spell" ? this.object.getFlag("itemcollection", "importSpells") : !this.object.getFlag("itemcollection", "importSpells")) // isSpell XOR !importSpells
          && (!itemData.flags.itemcollection)
          && (capacity == 0 || (capacity > weight + this._calcItemWeight(itemData)) ) /* bag not too full */ ) 
      {
        await this.object.actor.deleteOwnedItem(itemData.id);
        newItems.push(itemData); 
        count += 1;
        weight += this._calcItemWeight(itemData);
      } else newOwnedItems.push(itemData);
    }
    await this._addManyBagItems(newItems);
    // await this.object.actor.update({"items": newOwnedItems});
    await this.updateWeight();
    this.render(false);
  }

  async _itemExport(event) {

    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.object.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o.id === id);
    if (idx === -1) {

      throw new Error(`OwnedItem ${id} not found in Bag ${this.object.data._id}`);
    }

    if (this.object.actor && !items[idx].flags.itemcollection) { // not a bag
      // seem to need to wait in case they press delete too fast 
      // and the next one comes through before the previous has finsihed which buggers up the item numbers
      await this.object.actor.createOwnedItem(duplicate(items[idx]), {}) ;
      await this.deleteOwnedItem(id);
      this.render(false);
      return;
    } else if (items[idx].flags.itemcollection) {
      // is a bag do an import of everything in the bag
      // not an owned item, if it is a bag import all items from the selected bag if there are any.
      for (let itemData of items[idx].flags.itemcollection.contents) {
        itemData.id = items.length ? Math.max(...items.map(iData => iData.id)) + 1 : 1;
        items.push(itemData);
      }
      // add the currency from the bag
      let itemCurrency = items[idx].data.currency;
      let bagCurrency = duplicate(this.object.data.data.currency);
      for (let denom of ["pp", "gp", "ep", "sp", "cp"]) {
        bagCurrency[denom] += Number(itemCurrency[denom] || 0);
        itemCurrency[denom] = 0;
      }
      items[idx].flags.itemcollection.contents = [];
      // TODO recalc bag weight
      items[idx].data.weight = 0;
      let updateData = {"flags.itemcollection.contents": duplicate(items),
                    "data.currency": bagCurrency};
      await this.object.update(updateData);
//      await this.object.setFlag("itemcollection", "contents", duplicate(items));
//      await this.object.update({"data.currency": bagCurrency});
      await this.updateWeight();
    }
  }

  async _itemSplit(event) {
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = duplicate(this.object.getFlag("itemcollection", "contents"));
    let idx = items.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
    if (items[idx].flags.itemcollection) return; // cant split a bag
    if (!items[idx].data.quantity || items[idx].data.quantity < 2) return;
    let itemData = items[idx];
    let newQuantity = Math.floor(itemData.data.quantity / 2);
    itemData.data.quantity -= newQuantity;
    let newItemData = duplicate(itemData);
    newItemData.data.quantity = newQuantity;
    // items.push(newItemData)
    await this.object.setFlag("itemcollection", "contents", items);
    this.createOwnedItem(newItemData, {})
  }

  async _itemConvertToGold(event) {
    if (!game.settings.get('itemcollection', 'goldConversion')) return;
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.object.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
    let itemData = items[idx];
    if (itemData.flags.itemcollection) return; // cant sell a bag
    let goldValue = this._calcItemPrice(itemData);
    if (goldValue <= 0) return;
    // remove the item
    items.splice(idx,1);
    await this.object.setFlag("itemcollection", "contents", duplicate(items));

    // add the gold
    this.object.data.data.currency.gp += Math.round(goldValue * game.settings.get('itemcollection', 'goldConversionPercentage') / 100);
    this.updateWeight();
  }

  async _compactAll() {
    let items = duplicate(this.object.data.flags.itemcollection.contents);
    let mergedItems = {};
    let keptItems = [];
    for (const itemData of items) {
      if (!itemData.flags.itemcollection) {
        if (mergedItems[itemData.name]) {
          if(mergedItems[itemData.name].data.quantity) mergedItems[itemData.name].data.quantity += itemData.data.quantity || 1;
        } else mergedItems[itemData.name] = itemData;
      } else keptItems.push(itemData);
    }
    items = Object.values(mergedItems).concat(keptItems);
    console.log("   ITEMS ARE "); console.log(items);
    await this.object.setFlag("itemcollection", "contents", items);
    console.log(this.object)
    if (this.object.actor) await this.object.actor.updateOwnedItem(this.object.data)
    await this.updateWeight();
    this.render(false);
  }

  async _exportAll(event) {
    if (!this.object.actor) return;
      
    let contents = this.object.getFlag("itemcollection", "contents");
    console.log(`itemcollection | exporting ${contents.length} items to actor ${this.object.actor.data._id}`)
    await this.object.setFlag("itemcollection", "contents", []);
    for (let itemData of contents) {
      await this.object.actor.createOwnedItem(itemData, {});
    }

    // move the gold from the bag into the actor.
    let currency = duplicate(this.object.actor.data.data.currency);
    ["pp", "gp", "ep", "sp", "cp"].forEach((denom) => {
      currency[denom] += this.object.data.data.currency[denom];
      this.object.data.data.currency[denom] = 0;
    });
    await this.actor.update({"data.currency": currency});
    await this.object.actor.updateOwnedItem(this.object.data)
    await this.updateWeight();
    this.render(false);
  }

  // We are acting as an owner of items so need to respond to various requests
  hasPerm = function(...args) {  return this.object.hasPerm(...args)  }
  get items() { return this.object.data.flags.itemcollection.contents}
  
  update(data,options) {
    this.object.update(data, options)
  }
  

  async _editItem(ev) {
    // not done yet
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.object.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
    
    // let item = await Item.create(items[idx], {temporary: true, displaySheet: false});
    let item = await new Item5e(items[idx]);
    item.actor = this;
    if (!this._id) this._id = game.user._id;
    setProperty(this, "data.data.attributes.spelldc", 10); // fake this for spell editing
    setProperty(this, "data.data.currency", this.object.data.data.currency);
    item.data.id = id;
    item.sheet.render(true);
    return;
  }

  _onItemSummary(event) {
    return;
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.object.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o.id === id);
    if (idx === -1) return;
    let item = new Item5e(items[idx]);
    let chatData = item.getChatData({secrets: this.object.actor.owner});
    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below is only needed if the sheet is editable
    if ( !this.options.editable ) return;
    // Make the Actor sheet droppable for Items if it is not owned by a token or npc
    if (this.item.type === "backpack" || this.item.type === "loot") {
        this.form.ondragover = ev => this._onDragOver(ev);
        this.form.ondrop = ev => this._onDrop(ev);

        let handler = ev => this._onDragItemStart(ev);
        html.find('.item').each((i, li) => {
          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", handler, false);
        });

        document.addEventListener("dragend", this._onDragEnd.bind(this));
        // html[0].ondragend = this._onDragEnd.bind(this);

    }

    html.find("input").focusout(this._onUnfocus.bind(this));

      // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item"),
      itemId = Number(li.attr("data-item-id"));
      this.deleteOwnedItem(itemId);
    });

    html.find('.item-edit').click(ev => this._editItem(ev));
    html.find('.item-export-all').click(ev => this._exportAll());
    html.find('.item-export').click(ev => this._itemExport(ev));
    html.find('.item-compact-all').click(ev => this._compactAll());
    html.find('.item-import-all').click(ev => this._importAllItemsFromActor());
    html.find('.item-split').click(ev => this._itemSplit(ev));
    html.find('.item-convertToGold').click(ev => this._itemConvertToGold(ev));
    html.find('.item .item-name h4').click(event => this._onItemSummary(event));
  //  html.find('.bag-equipped').click(ev => this._toggleEquipped(ev));
  }

  _onDragEnd(event) {

    event.preventDefault();
    return false;
  }
  _onDragOver(event) {
    event.preventDefault();
    return false;
  }

  _onUnfocus(event) {
    this._submitting = true;
    setTimeout(() => {
      let hasFocus = $(":focus").length;
      if ( !hasFocus ) this._onSubmit(event);
      this._submitting = false;
    }, 25);
  }
}

Hooks.once("setup", () => {   

  console.log("Setting known Sheets");
  setup(ItemCollectionTemplate);
});

Hooks.once("ready", () => {

});
