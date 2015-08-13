var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var TorrentConstants = require('../constants/TorrentConstants');
var UIConstants = require('../constants/UIConstants');
var assign = require('object-assign');
var $ = require('jquery');
var _ = require('underscore');

var _torrents = [];
var _filtered = true;
var _filterText = '';
var _filterStatus = 'all';
var _sortedTorrents = [];
var _sorted = true;
var _sortCriteria = {
  property: 'name',
  direction: 'asc'
}

var TorrentStore = assign({}, EventEmitter.prototype, {

  getAll: function() {

    if (_sorted) {
      _sortedTorrents = sortTorrentList();

      if (_filtered) {
        _sortedTorrents = filterTorrentList();
      }

      return _sortedTorrents;
    } else {

      return _torrents;
    }

  },

  getSortCriteria: function() {

    if (_sorted) {
      return _sortCriteria;
    } else {
      return false;
    }
  },

  getFilterCriteria: function() {

    return _filterStatus;
  },

  emitChange: function() {
    this.emit(TorrentConstants.TORRENT_LIST_CHANGE);
  },

  emitSortChange: function() {
    this.emit(UIConstants.FILTER_SORT_CHANGE);
  },

  emitFilterChange: function() {
    this.emit(UIConstants.FILTER_STATUS_CHANGE);
  },

  addChangeListener: function(callback) {
    this.on(TorrentConstants.TORRENT_LIST_CHANGE, callback);
  },

  addSortChangeListener: function(callback) {
    this.on(UIConstants.FILTER_SORT_CHANGE, callback);
  },

  addFilterChangeListener: function(callback) {
    this.on(UIConstants.FILTER_STATUS_CHANGE, callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener(TorrentConstants.TORRENT_LIST_CHANGE, callback);
  },

  removeSortChangeListener: function(callback) {
    this.removeListener(UIConstants.FILTER_SORT_CHANGE, callback);
  },

  removeFilterChangeListener: function(callback) {
    this.removeListener(UIConstants.FILTER_STATUS_CHANGE, callback);
  }

});

var dispatcherIndex = AppDispatcher.register(function(action) {

  var text;

  switch(action.actionType) {

    case TorrentConstants.TORRENT_STOP:
      getTorrentList();
      break;

    case TorrentConstants.TORRENT_START:
      getTorrentList();
      break;

    case UIConstants.FILTER_SORT_CHANGE:
      _sortCriteria.property = action.property;
      _sortCriteria.direction = action.direction;
      TorrentStore.emitSortChange();
      TorrentStore.emitChange();
      break;

    case UIConstants.FILTER_SEARCH_CHANGE:
      _filterText = action.query;
      TorrentStore.emitChange();
      break;

    case UIConstants.FILTER_STATUS_CHANGE:
      _filterStatus = action.status;
      console.log(_filterStatus);
      TorrentStore.emitChange();
      TorrentStore.emitFilterChange();
      break;

  }
});

var filterTorrentList = function() {

  var torrents = _sortedTorrents.slice();

  torrents = _.filter(torrents, function(torrent) {

    if (_filterStatus !== 'all') {
      return torrent.status.indexOf('is-' + _filterStatus) > -1;
    } else {
      return true;
    }
  });

  try {
    torrents = _.filter(torrents, function(torrent) {
      var query = new RegExp(_filterText, 'gi');
      return torrent.name.match(query)
    });
  } catch (error) {

    return torrents;
  }

  return torrents;

}

var getTorrentList = function(callback) {

  $.ajax({
    url: '/torrents/list',
    dataType: 'json',

    success: function(data) {

      _torrents = data;

      if (_sorted) {
        _sortedTorrents = sortTorrentList();
      }

      TorrentStore.emitChange();
    }.bind(this),

    error: function(xhr, status, err) {
      console.error('/torrents/list', status, err.toString());
    }.bind(this)
  });

};

var sortTorrentList = function() {

  var property = _sortCriteria.property;
  var direction = _sortCriteria.direction;
  var sortedList = _torrents.slice();

  sortedList = sortedList.sort(function(a, b) {

    var valA = a[property];
    var valB = b[property];

    if (property === 'eta') {

      // keep infinity at bottom of array when sorting by eta
      if (valA === 'Infinity' && valB !== 'Infinity') {
        return 1;
      } else if (valA !== 'Infinity' && valB === 'Infinity') {
        return -1;
      }

      // if it's not infinity, compare the second as numbers
      if (valA !== 'Infinity') {
        valA = Number(valA.seconds);
      }

      if (valB !== 'Infinity') {
        valB = Number(valB.seconds);
      }

    } else if (property === 'name') {

      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    } else {

      valA = Number(valA);
      valB = Number(valB);
    }

    if (direction === 'asc') {

      if (valA > valB) {
        return 1;
      }

      if (valA < valB) {
        return -1;
      }

    } else {

      if (valA > valB) {
        return -1;
      }

      if (valA < valB) {
        return 1;
      }

    }

    return 0;
  });

  return sortedList;
};

getTorrentList();
setInterval(getTorrentList, 5000);

module.exports = TorrentStore;