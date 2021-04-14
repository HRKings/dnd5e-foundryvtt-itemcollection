import { debug, log, setDebugLevel, warn, i18n } from '../ItemCollection';

export const MODULE_NAME = 'itemcollection';

/**
 * Because typescript doesn’t know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it’s typed as declare let canvas: Canvas | {ready: false}.
 * That’s why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because a „no canvas“ mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
 export function getCanvas(): Canvas {
  if (!(canvas instanceof Canvas) || !canvas.ready) {
      throw new Error("Canvas Is Not Initialized");
  }
  return canvas;
}

export const registerSettings = function () {
    // log("Executing settings");
    /*
    // Register any custom module settings here
    let settingsReg = [
      {
        name: "goldConversion",
        scope: "world",
        default: true,
        type: Boolean,
        config: true,
        onChange: value => {
          // DO SOMETHING
        }
      }, 
      {
        name: "goldConversionPercentage",
        scope: "world",
        default: 50,
        type: Number,
        config: true,
        onChange: value => {
          // DO SOMETHING
         }
      },
      {
        name: "sortBagContents",
        scope: "module",
        default: true,
        type: Boolean,
        config: true,
        onChange: value => {
         // DO SOMETHING
        }
      }
    ];

    settingsReg.forEach((setting, i) => {
      let MODULE = MODULE_NAME
      let options = {
          name: game.i18n.localize(`${MODULE}.${setting.name}.Name`),
          hint: game.i18n.localize(`${MODULE}.${setting.name}.Hint`),
          scope: setting.scope,
          config: (setting.config === undefined) ? true : setting.config,
          default: setting.default,
          type: setting.type,
          onChange: setting.onChange
      };
      //@ts-ignore
      if (setting.choices) options.choices = setting.choices;
      game.settings.register(MODULE_NAME, setting.name, options);
    });
    */
    setup(ItemCollectionTemplate);
}

let ItemCollectionTemplate = (function() {

  let config = {
    /**
     * The Module name
     */
    name: MODULE_NAME,

    /**
     * The module title
     */
    title: "Item Collection Settings",

    /**
     * Some generic path references that might be useful later in the application's windows
     */
    path: {
      root: `/modules/${MODULE_NAME}/`,
      itemSideBarTemplate:`/modules/${MODULE_NAME}/templates/bag-sheet.html`,
      itemDetailsTemplate:`/modules/${MODULE_NAME}/templates/shop-sheet.html`,
    },
    /*
    itemSheetTemplate: `public/modules/${MODULE_NAME}/templates/itemSheet.html`,
    characterSheetTemplate: `public/modules/${MODULE_NAME}/templates/characterSheet.html`,
    */
    /**
     * For each setting, there is are two corresponding entries in the language file to retrieve the translations for
     * - the setting name
     * - the hint displayed beneath the setting's name in the "Configure Game Settings" dialog.
     *
     * Given your MODULE_NAME is 'my-module' and your setting's name is 'EnableCritsOnly', then you will need to create to language entries:
     * {
     *  "my-module.EnableCritsOnly.Name": "Enable critical hits only",
     *  "my-module.EnableCritsOnly.Hint": "Players will only hit if they crit, and otherwise miss automatically *manic laughter*"
     * }
     *
     * The naming scheme is:
     * {
     *  "[MODULE_NAME].[SETTING_NAME].Name": "[TEXT]",
     *  "[MODULE_NAME].[SETTING_NAME].Hint": "[TEXT]"
     * }
     */
    settings: [
      {
        name: "goldConversion",
        scope: "world",
        default: true,
        type: Boolean
      }, {
        name: "goldConversionPercentage",
        scope: "world",
        default: 50,
        type: Number
      },{
        name: "sortBagContents",
        scope: "module",
        default: true,
        type: Boolean
      }
    ]
  };

  return {
    path: () => {
        return config.path
    },
    settings: function() {
      return config.settings;
    },
    name: () => {
        return config.name
    },
    title: () => {
        return config.title
    }
  }
})();

function setup(templateSettings) {
	templateSettings.settings().forEach(setting => {
		let options:ClientSettings.PartialSetting = {
       name: i18n(`${templateSettings.name()}.${setting.name}.Name`),
      hint: i18n(`${templateSettings.name()}.${setting.name}.Hint`),
			scope: setting.scope,
			config: true,
			default: setting.default,
			type: setting.type,
			choices: {}
		};
		if (setting.choices) {
      options.choices = setting.choices;
    }
		game.settings.register(templateSettings.name(), setting.name, options);
	});
}