// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  // chrome.tabs.query(queryInfo, (tabs) => {
  //   // chrome.tabs.query invokes the callback with a list of tabs that match the
  //   // query. When the popup is opened, there is certainly a window and at least
  //   // one tab, so we can safely assume that |tabs| is a non-empty array.
  //   // A window can only have one active tab at a time, so the array consists of
  //   // exactly one tab.
  //   var tab = tabs[0];
  //
  //   // A tab is a plain object that provides information about the tab.
  //   // See https://developer.chrome.com/extensions/tabs#type-Tab
  //   var url = tab.url;
  //
  //   // tab.url is only available if the "activeTab" permission is declared.
  //   // If you want to see the URL of other tabs (e.g. after removing active:true
  //   // from |queryInfo|), then the "tabs" permission is required to see their
  //   // "url" properties.
  //   console.assert(typeof url == 'string', 'tab.url should be a string');
  //
  //   callback(url);
  // });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, (tabs) => {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * Change the background color of the current page.
 *
 * @param {string} color The new background color.
 */
function changeBackgroundColor(color) {
  var script = 'document.body.style.backgroundColor="' + color + '";';
  // See https://developer.chrome.com/extensions/tabs#method-executeScript.
  // chrome.tabs.executeScript allows us to programmatically inject JavaScript
  // into a page. Since we omit the optional first argument "tabId", the script
  // is inserted into the active tab of the current window, which serves as the
  // default.
  chrome.tabs.executeScript({
    code: script
  });
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
 */
function getSavedBackgroundColor(url, callback) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  chrome.storage.sync.get(url, (items) => {
    callback(chrome.runtime.lastError ? null : items[url]);
  });
}

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
function saveBackgroundColor(url, color) {
  var items = {};
  items[url] = color;
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // background color is saved.
  chrome.storage.sync.set(items);
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabUrl((url) => {
    var dropdown = document.getElementById('dropdown');

    // Load the saved background color for this page and modify the dropdown
    // value, if needed.
    getSavedBackgroundColor(url, (savedColor) => {
      if (savedColor) {
        changeBackgroundColor(savedColor);
        dropdown.value = savedColor;
      }
    });

    // Ensure the background color is changed and saved when the dropdown
    // selection changes.
    dropdown.addEventListener('change', () => {
      changeBackgroundColor(dropdown.value);
      saveBackgroundColor(url, dropdown.value);
    });
  });
});

// MY CODE

// VUE stuff
var storageKey = 'dnd-initiative-tracker-v2';
var initiativeApp = new Vue({
  el: '#initiative-app',
  ready: function () {
    if (chrome.storage) {
      chrome.storage.sync.get(storageKey, (items) => {
        var val = chrome.runtime.lastError ? null : items[storageKey];
        this.players = val || [];
      });
    }

    this.$watch('players', function () {
      var items = {};
      items[storageKey] = this.players;
      if (chrome.storage) {
        chrome.storage.sync.set(items);
      }
    }, {deep:true});

    var that = this;
    $(document).ready(function() {
      $('tbody').sortable({
        update: function(event, ui) {
          var rows = $('tbody tr');
          var newPos = {};
          for(var i = 0; i < rows.length; i++) {
            var playerName = rows[i].id;
            newPos[playerName] = i;
          }

          var curIdx = 0;
          that.players.forEach(function(player) {
            var updatedPos = newPos[player.name];
            player.order = updatedPos;
          });
        }
      });
    });

    // Load "Monster" spreadsheet data
    var monstersUrl = 'https://spreadsheets.google.com/feeds/list/1BNZmFja3dRqcT_zKRiXQjueW3aPv2909vsPFMreQPyc/od6/public/values?alt=json';
    axios.get(monstersUrl).then(function(response) {
      var monsters = response.data.feed.entry.map(function(item) {
					return {
						name: item['gsx$name']['$t'],
						hp: item['gsx$hp']['$t'],
            ac: item['gsx$ac']['$t'],
            cr: item['gsx$cr']['$t']
					};
        });
      that.existingMonsters = monsters;
    });

    // Load "Player" spreadsheet data
    var playersUrl = 'https://spreadsheets.google.com/feeds/list/1BNZmFja3dRqcT_zKRiXQjueW3aPv2909vsPFMreQPyc/o14rhi9/public/values?alt=json';
    axios.get(playersUrl).then(function(response) {
      var groups = {};
      var players = response.data.feed.entry.map(function(item) {
          var curCampaign = item['gsx$campaign']['$t'];
          groups[curCampaign] = groups[curCampaign] || [];
					var item =  {
						name: item['gsx$name']['$t'],
						hp: item['gsx$hp']['$t'],
            ac: item['gsx$ac']['$t'],
            campaign: curCampaign
					};
          groups[curCampaign].push(item);
          return item;
        });
      that.existingPlayers = players;
      that.groups = groups;
      that.groupNames = Object.keys(groups);
    });
  },
  data: {
    newEntryName: '',
    newEntryInitiative: '',
    newEntryHitPoints: '',
    newEntryArmorClass: '',
    players: [],
    lastSortKey: '',
    existingPlayers: [],
    existingMonsters: [],
    groups: {},
    groupNames: []
  },
  methods: {
  	addRow: function() {
      if (this.newEntryName == null || this.newEntryName == '') {
      	return;
      }

      // no dupe names
      for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].name === this.newEntryName) return;
      }

      var curLength = this.players.length;
    	this.players.push({
      	name: this.newEntryName,
        initiative: this.newEntryInitiative,
        hitPoints: this.newEntryHitPoints,
        armorClass: this.newEntryArmorClass,
        persisted: false,
        order: curLength
      });
      this.newEntryName = '';
      this.newEntryInitiative = '';
      this.newEntryHitPoints = '';
      this.newEntryArmorClass = '';
    },
    addMonster: function() {
      if (this.selectedMonster == null || typeof this.selectedMonster === "undefined" || this.selectedMonster === '') {
        return;
      }

      var monster = JSON.parse(JSON.stringify(this.selectedMonster));

      // check for dupe name
      for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].name === monster.name) {
          monster.name += " (" + getHash() + ")";
          break;
        }
      }

      var curLength = this.players.length;
    	this.players.push({
      	name: monster.name,
        initiative: 10,
        hitPoints: monster.hp,
        armorClass: monster.ac,
        persisted: false,
        order: curLength
      });

      function getHash() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 3; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
      }
    },
    addPlayer: function() {
      if (this.selectedPlayer == null || typeof this.selectedPlayer === "undefined" || this.selectedPlayer === '') {
        return;
      }

      var player = JSON.parse(JSON.stringify(this.selectedPlayer));

      // no dupe players
      for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].name === player.name) return;
      }

      var curLength = this.players.length;
    	this.players.push({
      	name: player.name,
        initiative: 10,
        hitPoints: player.hp,
        armorClass: player.ac,
        persisted: true,
        order: curLength
      });

      function getHash() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 3; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
      }
    },
    selectGroup: function() {
      if (this.selectedGroupName == null || typeof this.selectedGroupName === "undefined" || this.selectedGroupName === '') {
        return;
      }

      var curGroup = this.groups[this.selectedGroupName];
      var players = [];
      for(var i = 0; i < curGroup.length; i++) {
        var playa = curGroup[i];
        players.push({
        	name: playa.name,
          initiative: 10,
          hitPoints: playa.hp,
          armorClass: playa.ac,
          persisted: true,
          order: i
        });
      }

      this.players = players;
    },
    removeRow: function(player) {
      var idx = 0;
      for (idx = 0; idx < this.players.length; idx++) {
        if (this.players[idx].name === player.name) break;
      }
    	if (idx >= 0 && idx < this.players.length) {
        this.players.splice(idx, 1);
      }
    },
    changeHp: function(player, amount) {
      player.hitPoints = Math.max(0, parseInt(player.hitPoints) + amount);
    },
    lockPlayer: function(player) {
      player.persisted = true;
    },
    unlockPlayer: function(player) {
      player.persisted = false;
    },
    sortBy: function(sortKey) {
      var sorted = [];
      if (this.lastSortKey === sortKey) {
        // reverse sort
        sorted = this.players.sort(compareValues(sortKey, "desc"));

        this.lastSortKey = '';
      } else {
        // normal sort
        sorted = this.players.sort(compareValues(sortKey, "asc"));

        this.lastSortKey = sortKey;
      }

      var newOrderDict = {};
      for(var order = 0; order < sorted.length; order++) {
        newOrderDict[sorted[order].name] = order;
      }
      for(var i = 0; i < this.players.length; i++) {
        this.players[i].order = newOrderDict[this.players[i].name];
      }

      // pulled from: https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
      function compareValues(key, order='asc') {
        return function(a, b) {
          if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
            // property doesn't exist on either object
              return 0;
          }

          var varA = (typeof a[key] === 'string') ?
            a[key].toUpperCase() : a[key];
          varA = !isNaN(varA) ? parseInt(varA) : varA;
          var varB = (typeof b[key] === 'string') ?
            b[key].toUpperCase() : b[key];
          varB = !isNaN(varB) ? parseInt(varB) : varB;

          let comparison = 0;
          if (varA > varB) {
            comparison = 1;
          } else if (varA < varB) {
            comparison = -1;
          }
          return (
            (order == 'desc') ? (comparison * -1) : comparison
          );
        };
      }
    },
    dupePlayer: function(player) {
      var name = player.name;
      var counter = name.substr(name.length-1);
      var newCounter = 1;
      if (!isNaN(counter)) {
        newCounter = parseInt(counter) + 1;
        name = name.substr(0, name.length-1);
      }
      this.newEntryName = name + newCounter;
      this.newEntryInitiative = player.initiative;
      this.newEntryHitPoints = player.hitPoints;
      this.newEntryArmorClass = player.armorClass;

      $('[href="#custom"]').tab('show');
    }
  }
})
