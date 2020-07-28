import { DND5E } from "/systems/dnd5e/module/config.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
import ItemSheet5e from "/systems/dnd5e/module/item/sheet.js";
import { ItemSheet5eWithBags } from "/modules/itemcollection/lib/ItemSheet5eWithBags.js"

let knownSheets = {};
let templates = {};

export class ItemSheetShop extends ItemSheet5eWithBags {
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
    return  "modules/itemcollection/templates/shop-sheet.html";
  }


  render(...args) {
    super.render(...args);
  }

  async _onSubmit(event, {updateData=null, preventClose=false}={}) {
    if (this.item.type !== "backpack") updateData = expandObject({"flags.-=itemcollection": null});
      super._onSubmit(event, {"updateData": updateData, "preventClose": preventClose})
  }

  async getData() {
    const type = this.item.data.type;

    if (!["backpack"].includes(type)) {
      ui.notifications.error(game.i18n.localize("itemcollection.wrongType"))
      this.options.editable = false;
      return super.getData();
    };
  
    this._sheetTab="details"

    const item = this.item;
    var data = super.getData();
    data.flags = item.data.flags

    if (!hasProperty(data.flags, "itemcollection.markup"))
      setProperty(data.flags,"itemcollection.markup", 10);

    let markup = (getProperty(data.flags,"itemcollection.markup") || 0) / 100;
    for (let i = 0; i < data.flags.itemcollection.contents.length; i++) {
      data.flags.itemcollection.contents[i].data.marketPrice = Math.floor(data.flags.itemcollection.contents[i].data.price * (1+markup));
    }

    this.options.editable = this.options.editable// && (!this.item.actor || !this.item.actor.token);
    return data;
  }


  _getWeightChangeString() {
  }

  async updateWeight() { // do we need to do this
    return super.updateWeight()
  }

  
  async _onDragItemStart(event) {
    event.stopPropagation();
    if (game.user.isGM) super._onDragItemStart(event);
    return true;
  }

  canAdd(itemData) {
    return true;
  }

  async _onDrop(event) {
    event.stopPropagation();
    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ( data.type !== "Item" ) {
        console.log("ItemCollection | Bags only accept items");
        return false;
      }
    }
    catch (err) {
      console.log("ItemCollection | drop error")
      console.log(event.dataTransfer.getData('text/plain'));
      console.log(err);
      return false;
    }
    // Case 1 - Data explicitly provided
    if ( data.data ) {
      if ((this.item.isOwned && data.actorId === this.item.actor._id) && data.data._id === this.item.data._id) {
        console.log("ItemCollection | Cant drop on yourself");
        ui.notifications.info(game.i18n.localize('itemcollection.ExtradimensionalVortex'));
        throw new Error("Dragging bag onto istelf opens a planar vortex and you are sucked into it")
      }
      // We do't have the source actor. Only allow the drop from the same actor. *** TO DO ****
      // drop from player characters or another bag.
      let actor = (data.actorId) ? game.actors.get(data.actorId) : undefined;
          // will fit in the bag so add it to the bag and delete from the owning actor if there is one.
      let toDelete = data.data._id;
      await this.createOwnedItem(data.data, {displaySheet: false});
      if (actor && actor.data.type === "character") await actor.deleteOwnedItem(toDelete);
      // do we pay for the item?
      this.render(false); 
      return false;
    }

    // Case 2 - Import from a Compendium pack
    else if ( data.pack ) {
      this._importItemFromCollection(data.pack, data.id);
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      await this.createOwnedItem(duplicate(item.data), {});
    }
    return false;
  }

  async _importItemFromCollection(collection, entryId) {
    const pack = game.packs.find(p => p.collection === collection);
    if ( pack.metadata.entity !== "Item" && pack.metadata.entity !== "Spell") return;
    return pack.getEntity(entryId).then(ent => {
      // delete ent.data._id;
        console.log(`ItemCollection | Importing Item ${ent.name} from ${collection}`);
        this.createOwnedItem(duplicate(ent.data), {});
    });
  }


  // don't allow exporting for shops
  async _itemExport(event) {
    event.stopPropagation();

    return true;
    // no exporting for shops
  }

  async _itemConvertToGold(event) { // this will be the purchase option
    event.stopPropagation();
    // find out the actor doing the buying and flag error if no selecte
    let actor;
    if (canvas.tokens.controlled.length > 0) {
      actor = canvas.tokens.controlled[0].actor;
    }
    if (!actor) actor = game.actors.get(ChatMessage.getSpeaker().actor);
    if (!actor) {
      ui.notifications.warn(`${game.i18n.localize("itemcollection.noSelection")}`)
      return;
    }

    // find the item
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = duplicate(this.item.getFlag("itemcollection", "contents"));
    let idx = items.findIndex(o => o._id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Shop ${this.item._id}`);
    let itemData = items[idx];

    // ask how many they want to buy
    let quantity = 1;

    let markup = (getProperty(this.object.data.flags,"itemcollection.markup") || 0) / 100;
    let goldValue = Math.floor((itemData.data.price * (1 + markup) * 10000))/ 10000 * quantity;
    let currency = duplicate(actor.data.data.currency);
    // check if they have enough money to pay for it and the currency adjustments needed.
    let coinValue = currency ?  Object.keys(currency)
        .reduce((val, denom) => val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom], 0) : 0;
    if (coinValue < goldValue) {
      ui.notifications.error(game.i18n.localize("itemcollection.NotEnoghGold"))
      return;
    }
    coinValue = (coinValue - goldValue) * 100; // how much we have left
    let conversion = {"cp" : 10, "sp": 10, "ep": 5, "gp": 10, "pp": 100000000000000};
    let newCurrency = ["cp", "sp", "gp", "pp"].reduce((nc,denom) => {
      nc[denom] =  coinValue % conversion[denom];
      coinValue = denom !== "pp" ? Math.floor(coinValue / conversion[denom]) : coinValue;
      return nc;
    }, {"pp" : 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0});

    // remove the gold from the actor
    // currency.gp -= goldValue;
    await actor.update({"data.currency": newCurrency});

    // add the item to the actor
    let doMerge = true;
    let existing = actor.data.items.find(i=>i.name === itemData.name && i.type === itemData.type);
    if (existing && doMerge) {
      actor.updateOwnedItem({"_id": existing._id, "data.quantity": existing.data.quantity + quantity});
    } else {
      let newItem = duplicate(itemData);
      newItem.data.quantity = quantity;
      await actor.createOwnedItem(newItem, {});
    }
    // add the gold to the shop
    currency = duplicate(this.item.data.data.currency);
    currency.gp += goldValue;
    if (this.item.isOwned) {
      await this.item.actor.updateOwnedItem({"_id": this.item._id, "data.currency": currency})
    } await this.item.update({"data.currency": currency});
    this.item.data.data.currency.gp = currency.gp;

    // remove the item from the shop deleting the item if the shop runs out
    items[idx].data.quantity -= quantity;
    if (items[idx].data.quantity  <= 0) {
      await this.deleteOwnedItem(id);
    } else {
      if (this.item.actor) {
        await this.item.updateParent(items);
      } else (await this.item.update({"flags.itemcollection.contents": items}));
    }
    this.render(false);
  }

  async _exportAll(event) {
    event.stopPropagation();
    return false;
  }
  
  update(data,options) {
    ev.stopPropagation();
    this.item.update(data, options)
  }
  
  async _editItem(event) {
    if (!game.user.isGM) return;
    super._editItem(event);
  }

  _onItemSummary(event) {
    event.stopPropagation();
    return;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below is only needed if the sheet is editable
    if ( !this.options.editable ) return;

    html.find("input").focusout(this._onUnfocus.bind(this));

    // Delete Inventory Item
      html.find('.item-delete').off().click(ev => {
        if (game.user.isGM) {
          let li = $(ev.currentTarget).parents(".item"),
          itemId = Number(li.attr("data-item-id"));
          this.deleteOwnedItem(itemId);
        }
      });
  }

  _onDragEnd(event) {
    event.stopPropagation()
    if (game.user.isGM) {
      super._onDragEnd(event);
    }
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
