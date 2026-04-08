'use strict';

angular
  .module('transitScreenApp')
  .controller('ConfigCtrl', ConfigCtrl);

function ConfigCtrl($rootScope, $state, $translate, ScreenConfig) {
  var vm = this;

  angular.extend(vm, {
    config: ScreenConfig,

    timeFormats: [{ name: '12 Hours', format: 'hh:mm A' }, { name: '24 Hours', format: 'HH:mm' }],
    locales: [{ name: 'English', lang: 'en' }, { name: 'Français', lang: 'fr' }],
    fontSizes: [
      { name: 'Normal', value: 'normal' },
      { name: 'Large', value: 'large' },
      { name: 'Larger', value: 'larger' }
    ],
    locale: $translate.instant('en'),
    onLocaleSelected: onLocaleSelected,

    BuffaloLocations: [
      { name: 'Current Location', lat: null, lng: null, isCurrent: true },
      { name: 'MTC 1', lat: 42.883521072757055, lng: -78.87233486485076},
      { name: 'Black Rock - Riverside Transit Hub', lat: 42.94571211629504, lng: -78.90717149979196},
      { name: 'University Station', lat: 42.95467195989534, lng: -78.82043667909868},
      { name: 'Utica Station', lat: 42.911535103476844, lng: -78.86537993994833},
      { name: 'Allen Station', lat: 42.899537524235186, lng: -78.86965814322626}, 
      { name: 'Portage Road Transit Center', lat: 43.099793380639916, lng: -79.05150964190122},
      { name: 'Niagara Falls Transit Center', lat: 43.10059559154971, lng: -78.9800302986398},
    ],
    onLocationSelected: onLocationSelected,

    isHidden: isHidden,
    unhide: unhide,

    save: save,
    duplicate: duplicate,
    closePanel: closePanel,
    exportConfig: exportConfig,
    importConfig: importConfig
  });

  // Initialize current location
  ScreenConfig.getCurrentLocation().then(function(location) {
    vm.clevelandLocations[0].lat = location.latitude;
    vm.clevelandLocations[0].lng = location.longitude;
  });

  function onLocaleSelected(locale) {
    $translate.use(locale.lang);
  }

  function onLocationSelected(location) {
    if (location.isCurrent) {
      ScreenConfig.getCurrentLocation().then(function(currentLocation) {
        ScreenConfig.latLng = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        };
        $rootScope.$emit('locationChanged');
      });
    } else {
      ScreenConfig.latLng = {
        latitude: location.lat,
        longitude: location.lng
      };
      $rootScope.$emit('locationChanged');
    }
  }

  function isHidden(route) {
    return ScreenConfig.hiddenRoutes.indexOf(route.global_route_id) !== -1;
  }

  function unhide(route) {
    var index = ScreenConfig.hiddenRoutes.indexOf(route.global_route_id);

    if (index !== -1) {
      ScreenConfig.hiddenRoutes.splice(index, 1);
      ScreenConfig.save();
    }
  }

  function save() {
    ScreenConfig.save();
    closePanel();
  }

  function duplicate() {
    ScreenConfig.id = '';
    $state.go('main', {}, {
      notify: false,
      reload: false,
      location: 'replace',
      inherit: true
    });
  }

  function closePanel() {
    ScreenConfig.isEditing = false;
  }

  function exportConfig() {
    var config = angular.copy(ScreenConfig);
    delete config.isEditing;
    var configStr = JSON.stringify(config, null, 2);
    
    // Copy to clipboard
    var textArea = document.createElement('textarea');
    textArea.value = configStr;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    alert('Configuration copied to clipboard!');
  }

  function findMatchingLocation(lat, lng) {
    // Helper function to compare coordinates with a small tolerance
    function coordinatesMatch(lat1, lng1, lat2, lng2) {
      var tolerance = 0.0001; // About 11 meters
      return Math.abs(lat1 - lat2) < tolerance && Math.abs(lng1 - lng2) < tolerance;
    }

    // Check each predefined location
    for (var i = 0; i < vm.clevelandLocations.length; i++) {
      var location = vm.clevelandLocations[i];
      if (location.lat !== null && location.lng !== null && 
          coordinatesMatch(lat, lng, location.lat, location.lng)) {
        return location;
      }
    }
    return null;
  }

  function importConfig() {
    var configStr = prompt('Paste your configuration JSON here:');
    if (!configStr) return;
    
    try {
      var config = JSON.parse(configStr);
      
      // Validate required fields
      var requiredFields = ['latLng', 'timeFormat', 'autoscrollEnabled', 'autoscrollInterval'];
      var missingFields = requiredFields.filter(field => !config.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        alert('Invalid configuration: Missing required fields: ' + missingFields.join(', '));
        return;
      }
      
      // Validate latLng structure
      if (!config.latLng.latitude || !config.latLng.longitude) {
        alert('Invalid configuration: latLng must contain latitude and longitude');
        return;
      }
      
      // Check if the imported config has coordinates that match a predefined location
      if (config.latLng) {
        var matchingLocation = findMatchingLocation(config.latLng.latitude, config.latLng.longitude);
        if (matchingLocation) {
          vm.selectedLocation = matchingLocation;
        }
      }
      
      angular.extend(ScreenConfig, config);
      ScreenConfig.save();
      $rootScope.$emit('locationChanged');
      alert('Configuration imported successfully!');
    } catch (e) {
      if (e instanceof SyntaxError) {
        alert('Invalid JSON format. Please check your configuration and try again.');
      } else {
        alert('Error importing configuration: ' + e.message);
      }
    }
  }
}
