var ItemCollection = function () {
    knownSheets = {};
    let templates = {};

  // setup all the hooks
  setup = (templateSettings) => {
      templates = {
          "bagSideBarTemplate": templateSettings.path().itemSideBarTemplate,
          "bagDetailsTemplate": templateSettings.path().itemDetailsTemplate,
          "rollTemplate": templateSettings.path().rollTemplate
      }
      loadTemplates(Object.values(templates));

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

      // Activate global listeners
      //Hooks.on('renderChatLog', (log, html, data) => Item5e.chatListeners(html));
      // Register Item Sheet
      Items.registerSheet("dnd5e", ItemSheet5eWithBags, {makeDefault: false});
  }

  enableSheetItemCollection = () => {};

  class ItemSheet5eWithBags extends ItemSheet5e {
    static get defaultOptions() {
      const options = super.defaultOptions;
      mergeObject(options, {
        width: 570,
        height: 500,
        showUnpreparedSpells: true
      });
      return options;
    }

    get title() {
         return `${this.object.name} ${this.object.actor && this.object.actor.token ? "[READ ONLY]" : ""}`;
    }

    async getData() {
      const type = this.object.data.type;
      if (type !== "backpack") {
        return super.getData();
      }
      const item = this.object;
      var data = super.getData();
      data.flags = item.data.flags

      if (!hasProperty(data.flags, "itemcollection")) { // first time the sheet has been opened add itemcollection data to the item
        setProperty(data.flags, "itemcollection.itemWeight", {"type": "Number", "label": "Item Weight", "value": 0});
        setProperty(data.flags,"itemcollection.fixedWeight", {"type": "Boolean", "label": "Fixed Weight", "value": false, "weight": 0});
        setProperty(data.flags,"itemcollection.capacity", {"label": "Capacity", "type": "Number", "value": 0});
        setProperty(data.flags,"itemcollection.goldValue", {"label": "Gold Value", "type": "Number", "value": 0});
        setProperty(data.flags,"itemcollection.contents", []);
        setProperty(data.flags,"itemcollection.equipped", {"type": "Boolean", "label": "Equipped", "value": true});
        setProperty(data.flags,"itemcollection.importSpells", {"type": "Boolean", "label": "Import Spells", "value": false});
        setProperty(data.flags,"itemcollection.currency", {
          "pp": {"type": "Number", "label": "Platinum", "value": 0},
                "gp": {"type": "Number", "label": "Gold", "value": 0},
                "ep": {"type": "Number", "label": "Electrum", "value": 0},
                "sp": {"type": "Number", "label": "Silver", "value": 0},
                "cp": {"type": "Number", "label": "Copper", "value": 0}
        });
      }
      
      if (!hasProperty(data.flags, "itemcollection.equipped")) { // later added 
        setProperty(data.flags, "itemcollection.equipped", {"type": "Boolean", "label": "Equipped", "value": true});
      }
      if (!hasProperty(data.flags, "itemcollection.importSpells")) {
        setProperty(data.flags, "itemcollection.importSpells", {"type": "Boolean", "label": "Import Spells", "value": false});
      }
      if (!hasProperty(data.flags, "itemcollection.fixedWeight.weight")) {
        setProperty(data.flags, "itemcollection.fixedWeight.weight", hasProperty(data.flags, "itemcollection.fixedWeight.value") ? this.object.data.data.weight.value  : 0);
      }
      if (!hasProperty(data.flags, "itemcollection.currency.ep")) {
        setProperty(data.flags, "itemcollection.currency", {
          "pp": {"type": "Number", "label": "Platinum", "value": item.getFlag("itemcollection", "currency.pp.value")},
          "gp": {"type": "Number", "label": "Gold", "value": item.getFlag("itemcollection", "currency.gp.value")},
          "ep": {"type": "Number", "label": "Electrum", "value": 0},
          "sp": {"type": "Number", "label": "Silver", "value": item.getFlag("itemcollection", "currency.sp.value")},
          "cp": {"type": "Number", "label": "Copper", "value": item.getFlag("itemcollection", "currency.cp.value")}
        });
      }
      this.options.editable = this.options.editable && (!this.object.actor || !this.object.actor.token);
      data.hasDetails = true;
      if (game.settings.get("itemcollection", "sortBagContents")) {
        data.flags.itemcollection.contents.sort((a,b) => {
          if (a.type !== b.type) return (a.type < b.type ? -1 : 1);
          if (a.type !== "spell") return (a.name < b.name ? -1 : 1);
          if (a.data.level.value !== b.data.level.value) return (a.data.level.value - b.data.level.value);
          return a.name < b.name ? -1 : 1;
        });
      }
//      data.flags = duplicate(this.object.data.flags);
      data.isGM = game.user.isGM;
      data.isOwned = !!this.object.actor;
      data.isEquipped = this.object.getFlag("itemcollection", "equipped.value");
      data.canConvertToGold = game.settings.get('itemcollection', 'goldConversion');
      data.detailsTemplate = () => {return templates.bagDetailsTemplate};
      data.sidebarTemplate = () => {return templates.bagSideBarTemplate};
      data.canUnEquip = this.object.actor && (data.flags.itemcollection.capacity.value !== 0 || game.user.isGM);
      data.data.owned = !!this.object.actor;

      let totalWeight = this._calcBagWeight();
      let totalGoldValue = this._calcBagGoldValue();
      for (let i of data.flags.itemcollection.contents){
        i.selected = false;
        i.owned = !!this.object.actor;
        i.totalWeight = this._calcItemWeight(i);
      }
      data.flags.itemcollection.goldValue.value = totalGoldValue;
      let equipped = item.getFlag("itemcollection", "equipped").value;
      if (!item.getFlag("itemcollection", "fixedWeight").value) {
        data.data.weight.value = equipped ? totalWeight : 0;
      }
      data.flags.itemcollection.itemWeight.value = totalWeight;
      return data;
    }

    _calcItemWeight(item) {
      let quantity = (item.data.quantity && item.data.quantity.value) || 1;
      let weight = (item.data.weight && item.data.weight.value) || 0;
      return weight * quantity;
    }

    _calcItemPrice(item) {
      let quantity = (item.data.quantity && item.data.quantity.value) || 1;
      let price = (item.data.price && item.data.price.value) || 0;
      if (typeof price === "string") { // trype to remove GP from the string
        price= price.replace(/[^\d]+/g, "");;
        price = Number(price);
      }
      return price * quantity;
    }

    _getWeightChangeString() {
      
    }

    async _updateWeight() {
      let bagWeight = this._calcBagWeight();
      let equipped = this.object.getFlag("itemcollection", "equipped.value");
      let isFixed = this.object.getFlag("itemcollection", "fixedWeight.value");
      let newBagWeight = !equipped ? 0 : isFixed ? this.object.getFlag("itemcollection", "fixedWeight.weight") : bagWeight;
      this.object.data.data.weight.value = newBagWeight;
      // this.object.data.flags.itemcollection.itemWeight.value = bagWeight;
      await this.object.setFlag("itemcollection", "itemWeight.value", bagWeight);
      if (this.object.actor) this.object.actor.updateOwnedItem(duplicate(this.object.data));
    }

    _calcBagGoldValue() {
      let totalItemValue = this.object.getFlag("itemcollection", "contents").reduce((val, item) => val += this._calcItemPrice(item), 0)
      const currency = this.object.getFlag("itemcollection", "currency");
      let coinValue = Object.keys(currency).reduce((val, denom) =>
      val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom].value, 0);
      return Math.round(totalItemValue + coinValue);
    }

    _calcBagWeight () {
      let totalWeight = this.object.getFlag("itemcollection", "contents").reduce((val, item) => val += this._calcItemWeight(item), 0);
      // Add Currency Weight
      if ( game.settings.get("dnd5e", "currencyWeight") ) {
        const currency = this.object.getFlag("itemcollection", "currency");
        const numCoins = Object.values(currency).reduce((val, denom) => val += denom.value, 0);
        totalWeight = Math.round((totalWeight + (numCoins / 50)) * 10) / 10;
      }
      return totalWeight;
    }

    _onDragItemStart(event) {
      const items = this.object.getFlag("itemcollection", "contents");
      const itemId = Number(event.currentTarget.dataset.itemId);
      let item = items.find(i => i.id === Number(itemId));
      event.dataTransfer.setData("text/plain", JSON.stringify({
        type: "Item",
        data: item
      }));
      this._deleteBagItem(itemId);
    }

    _deleteBagAllOwnedItems() {
      this.object.setFlag("itemcollection", "contents", []);
      this._updateWeight();
//      this.render(true);
    }

    async _deleteBagItem(deleted) {
      let contents = this.object.getFlag("itemcollection", "contents");
      let idx = contents.findIndex(o => o.id === deleted);
      if (idx === -1) throw new Error(`OwnedItem ${deleted} not found in Bag ${this.object.data.id}`);
      contents.splice(idx,1);
      console.log(`itemcollection | Deleted Item ${deleted} from bag ${this.object.data.id}`);
      await this.object.setFlag("itemcollection", "contents", duplicate(contents));
      this._updateWeight();
    }

    async _addBagItem(gameItem) {
      let item = duplicate(gameItem.data);
//      if (!this.canAdd(item)) return false;
      const items = this.object.getFlag("itemcollection", "contents");
      item.id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
      // mark the item as no longer owned.
      delete item._id
      items.push(item);
      await this.object.setFlag("itemcollection", "contents", duplicate(items));
      this._updateWeight();
      return true;
    }

    canAdd(item) {
      // Check that the item is not too heavy for the bag.
      let bagCapacity = this.object.getFlag("itemcollection", "capacity").value;
      if (bagCapacity === 0) return true;
      let newWeight = this._calcItemWeight(item);
      let bagItemWeight = Number(this.object.getFlag("itemcollection", "itemWeight").value);
      return bagCapacity >= bagItemWeight + newWeight;
    }

    async _onDrop(event) {
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
        if ( data.type !== "Item" ) {
          console.log("itemcollection | Bags only accept items");
          return;
        }
      }
      catch (err) {
        console.log(event.dataTransfer.getData('text/plain'));
        console.log(err);
        return false;
      }

      // Case 1 - Data explicitly provided
      if ( data.data ) {
        if (data.data.id === this.object.data.id) {
          console.log("itemcollection | Cant drop on yourself");
          ui.notifications.info(game.i18n.localize('itemcollection.ExtradimensionalVortex'));
          throw new Error("Dragging bag onto istelf opens a planar vortex and you are sucked into it")
        }
        // We do't have the source actor. Only allow the drop from the same actor. *** TO DO ****
        // drop from player characters or another bag.
        let actor = (data.actorId) ? game.actors.get(data.actorId) : undefined;
        if (this.canAdd(data.data)) {
            // will fit in the bag so add it to the bag and delete from the owning actor if there is one.
            await this._addBagItem(data);
            if (actor && actor.data.type === "character")  await actor.deleteOwnedItem(data.data.id);
            return;
        }
        // Item will not fit in the bag what to do?
        if (this.object.actor) { // this bag is owned by an actor - drop into the inventory instead.
            let myActor = game.actors.get(this.object.actor.data._id);
            await this.object.actor.createOwnedItem(data.data, {});
            ui.notifications.info(game.i18n.localize('itemcollection.AlternateDropInInventory'));
            if (actor && actor.data.type === "character") await actor.deleteOwnedItem(data.data.id) ;
            return;
        }

        // Last resort accept the drop anyway so that the item wont disappear.
        if (!actor) await this._addBagItem(data); 
      }

      // Case 2 - Import from a Compendium pack
      else if ( data.pack ) {
        this._importItemFromCollection(data.pack, data.id);
      }

      // Case 3 - Import from World entity
      else {
        let item = game.items.get(data.id);
        if (this.canAdd(item.data)) { // item will fit in the bag
          this._addBagItem(item);
        } else {
          console.log(`itemcolleciton | no room in bag for dropped item`);
          ui.notifications.info(game.i18n.localize('itemcollection.NoRoomInBag'));
        }
      }
    }

    async _importItemFromCollection(collection, entryId) {
      const pack = game.packs.find(p => p.collection === collection);
      if ( pack.metadata.entity !== "Item" && pack.metadata.entity !== "Spell") return;
      return pack.getEntity(entryId).then(ent => {
        delete ent.data._id;
        if (this.canAdd(ent.data)) {
          console.log(`itemcollection | Importing Item ${ent.name} from ${collection}`);
          this._addBagItem(ent);
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
      let weight = this._calcBagWeight();
      let capacity = this.object.getFlag("itemcollection", "capacity.value");
      let newOwnedItems = [];
      for (let item of allOwnedItems) {
        let itemData = item.data
        if ( (itemData.id !== this.object.data.id)   // don't import the bag itself
            && (["weapon", "equipment", "consumable", "tools","backpack", "spell"].includes(itemData.type)) // is it of the right type ?
            && (item.type === "spell" ? this.object.getFlag("itemcollection", "importSpells.value") : !this.object.getFlag("itemcollection", "importSpells.value")) // isSpell XOR !importSpells
            && (!itemData.flags.itemcollection)
            && (capacity == 0 || (capacity > weight + this._calcItemWeight(itemData)) ) /* bag not too full */ ) 
        {
//          await this.object.actor.deleteOwnedItem(item.id);
          items.push(itemData); 
          count += 1;
          weight += this._calcItemWeight(itemData);
        } else newOwnedItems.push(itemData);
      }
      await this.object.setFlag("itemcollection", "contents", duplicate(items));
      await this.object.actor.update({"items": newOwnedItems});
      await this._updateWeight();
    }

    async _itemExport(event) {

      let li = $(event.currentTarget).parents(".item");
      let id = Number(li.attr("data-item-id"));
      let items = this.object.getFlag("itemcollection", "contents");
      let idx = items.findIndex(o => o.id === id);
      if (idx === -1) throw new Error(`OwnedItem ${id} not found in Bag ${this.object.data._id}`);

      if (this.object.actor && !items[idx].flags.itemcollection) { // not a bag
        // seem to need to wait in case they press delete too fast 
        // and the next one comes through before the previous has finsihed which buggers up the item numbers
        await this.object.actor.createOwnedItem(items[idx], {}) ;
        this._deleteBagItem(id);
        return;
      } else if (items[idx].flags.itemcollection) {
        // is a bag do an import of everything in the bag
        let itemCurrency = items[idx].flags.itemcollection.currency;
        // not an owned item, if it is a bag import all items from the selected bag if there are any.
        for (let item of items[idx].flags.itemcollection.contents) {
          item.id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
          items.push(item);
        }
        // add the currency from the bag
        let bagCurrency = this.object.getFlag("itemcollection", "currency");
        for (let denom of ["pp", "gp", "ep", "sp", "cp"]) {
          bagCurrency[denom].value += Number(itemCurrency[denom].value || 0);
          itemCurrency[denom].value = 0;
        }
        items[idx].flags.itemcollection.contents = [];
        if (!items[idx].flags.itemcollection.fixedWeight.value) items[idx].data.weight.value = 0;
        await this.object.setFlag("itemcollection", "contents", duplicate(items));
        await this._updateWeight();
      }
    }

    async _itemSplit(event) {
      let li = $(event.currentTarget).parents(".item");
      let id = Number(li.attr("data-item-id"));
      let items = this.object.getFlag("itemcollection", "contents");
      let idx = items.findIndex(o => o.id === id);
      if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
      if (items[idx].flags.itemcollection) return; // cant split a bag
      if (!items[idx].data.quantity || items[idx].data.quantity.value < 2) return;
      let item = items[idx];
      let newQuantity = Math.floor(item.data.quantity.value / 2);
      item.data.quantity.value -= newQuantity;
      let newItem = duplicate(item);
      newItem.data.quantity.value = newQuantity;
      newItem.id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
      items.push(newItem);
      await this.object.setFlag("itemcollection", "contents", duplicate(items));
    }
    async _itemConvertToGold(event) {
      if (!game.settings.get('itemcollection', 'goldConversion')) return;
      let li = $(event.currentTarget).parents(".item");
      let id = Number(li.attr("data-item-id"));
      let items = this.object.getFlag("itemcollection", "contents");
      let idx = items.findIndex(o => o.id === id);
      if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
      let item = items[idx];
      if (item.flags.itemcollection) return; // cant sell a bag
      let goldValue = this._calcItemPrice(item);
      if (goldValue <= 0) return;
      // remove the item
      items.splice(idx,1);
      await this.object.setFlag("itemcollection", "contents", duplicate(items));

      // add the gold
      let gp = this.object.getFlag("itemcollection", "currency.gp.value");
      gp  += Math.round(goldValue * game.settings.get('itemcollection', 'goldConversionPercentage') / 100);
      await this.object.setFlag("itemcollection", "currency.gp.value", gp);
      this._updateWeight();
    }
    async _compactAll() {
      let items = this.object.getFlag("itemcollection", "contents");
      let mergedItems = {};
      let keptItems = [];
      for (let item of items) {
        if (!item.flags.itemcollection) {
          if (mergedItems[item.name]) {
            if(mergedItems[item.name].data.quantity) mergedItems[item.name].data.quantity.value += item.data.quantity.value || 1;
          } else mergedItems[item.name] = item;
        } else keptItems.push(item);
      }
      items = Object.values(mergedItems).concat(keptItems);
      await this.object.setFlag("itemcollection", "contents", duplicate(items));
      this._updateWeight();
    }

    async _exportAll(event) {
      if (!this.object.actor) return;
        
      let contents = this.object.getFlag("itemcollection", "contents");
      console.log(`itemcollection | exporting ${contents.length} items to actor ${this.object.actor.data._id}`)
      this.object.setFlag("itemcollection", "contents", []);
      for (let item of contents) {
        await this.object.actor.createOwnedItem(item, {});
      }



      // move the gold from the bag into the actor.
      let currency = duplicate(this.object.actor.data.data.currency);
      ["pp", "gp", "ep", "sp", "cp"].forEach((denom) =>
        currency[denom].value += this.object.getFlag("itemcollection", `currency.${denom}.value`)
      );
      await this.actor.update({"data.currency": currency});
      ["pp", "gp", "ep", "sp", "cp"].forEach((denom) => currency[denom].value = 0);
      await this.object.setFlag("itemcollection", "currency", currency);
      this._updateWeight();
    }


    async _editItem(ev) {
      // not done yet
      return;
    }

    async _toggleEquipped(event) {
      await this.object.setFlag("itemcollection", "equipped.value", !this.object.getFlag("itemcollection", "equipped.value"));
      this._updateWeight();
    };

    _onItemSummary(event) {
      return;
      event.preventDefault();
      let li = $(event.currentTarget).parents(".itemcollection .item");
      let id = Number(li.attr("data-item-id"));
      let items = this.object.getFlag("itemcollection", "contents");
      let idx = items.findIndex(o => o.id === id);
      if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.object.data._id}`);
      let item = items[idx];
      let chatData = enrichHTML(item.data.description.value, {secrets: false});
  
      // Toggle summary  .itemcollecton .inventory-list .item .item-summary
      if ( li.hasClass("expanded") ) {
        let summary = li.children(".itemcollection .item-summary");
        summary.slideUp(200, () => summary.remove());
      } else {
        let div = $(`<div class="item-summary">${chatData}</div>`);
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
      if (this.item.type === "backpack") {
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
        this._deleteBagItem(itemId);
      });

      html.find('.item-edit').click(ev => this._editItem(ev));
      html.find('.item-export-all').click(ev => this._exportAll());
      html.find('.item-export').click(ev => this._itemExport(ev));
      html.find('.item-compact-all').click(ev => this._compactAll());
      html.find('.item-import-all').click(ev => this._importAllItemsFromActor());
      html.find('.item-split').click(ev => this._itemSplit(ev));
      html.find('.item-convertToGold').click(ev => this._itemConvertToGold(ev));
      html.find('.item .item-name h4').click(event => this._onItemSummary(event));
      html.find('.bag-equipped').click(ev => this._toggleEquipped(ev));
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

  return {
    setup: setup,
    ItemSheet5eWithBags: ItemSheet5eWithBags
  }
}();
