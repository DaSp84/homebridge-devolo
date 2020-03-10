"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var HBDevoloDevice_1 = require("../HBDevoloDevice");
var HBDevoloRoomThermostatDevice = /** @class */ (function (_super) {
    __extends(HBDevoloRoomThermostatDevice, _super);
    function HBDevoloRoomThermostatDevice(log, dAPI, dDevice, storage, config) {
        var _this = _super.call(this, log, dAPI, dDevice, storage, config) || this;
        var self = _this;
        self.dDevice.events.on('onValueChanged', function (type, value) {
            if (type === 'temperature') {
                self.log.info('%s (%s / %s) > onValueChanged > CurrentTemperature is %s', self.constructor.name, self.dDevice.id, self.dDevice.name, value);
                self.thermostatService.getCharacteristic(self.Characteristic.CurrentTemperature).updateValue(value, null);
                // START FakeGato (eve app)
                if (self.config.fakeGato) {
                    if (self.loggingService.isHistoryLoaded()) {
                        self._addFakeGatoEntry({ currentTemp: value, setTemp: self.lastTargetTemp });
                        self.log.info("%s (%s / %s) > onValueChanged FakeGato > CurrentTemperature changed to %s, TargetTemperature is %s", self.constructor.name, self.dDevice.id, self.dDevice.name, value, self.lastTargetTemp);
                        self.lastCurrentTemp = value;
                    }
                    else {
                        self.log.info("%s (%s / %s) > onValueChanged FakeGato > CurrentTemperature %s not added - FakeGato history not yet loaded", self.constructor.name, self.dDevice.id, self.dDevice.name, value);
                    }
                }
                // END FakeGato (eve app)
            }
        });
        self.dDevice.events.on('onTargetValueChanged', function (type, value) {
            if (type === 'temperature') {
                self.log.info('%s (%s / %s) > onTargetValueChanged > TargetTemperature is %s', self.constructor.name, self.dDevice.id, self.dDevice.name, value);
                self.thermostatService.getCharacteristic(self.Characteristic.TargetTemperature).updateValue(value, null);
                // START FakeGato (eve app)
                if (self.config.fakeGato) {
                    if (self.loggingService.isHistoryLoaded()) {
                        self._addFakeGatoEntry({ currentTemp: self.lastCurrentTemp, setTemp: value });
                        self.log.info("%s (%s / %s) > onTargetValueChanged FakeGato > TargetTemperature changed to %s, CurrentTemperature is %s", self.constructor.name, self.dDevice.id, self.dDevice.name, value, self.lastCurrentTemp);
                        self.lastTargetTemp = value;
                    }
                    else {
                        self.log.info("%s (%s / %s) > onTargetValueChanged FakeGato > TargetTemperature %s not added - FakeGato history not yet loaded", self.constructor.name, self.dDevice.id, self.dDevice.name, value);
                    }
                }
                // END FakeGato (eve app)
            }
        });
        self.dDevice.events.on('onBatteryLevelChanged', function (value) {
            self.log.info('%s (%s / %s) > onBatteryLevelChanged > Battery level is %s', self.constructor.name, self.dDevice.id, self.dDevice.name, value);
            self.batteryService.getCharacteristic(self.Characteristic.BatteryLevel).updateValue(value, null);
        });
        self.dDevice.events.on('onBatteryLowChanged', function (value) {
            self.log.info('%s (%s / %s) > onBatteryLowChanged > Battery is low (%s)', self.constructor.name, self.dDevice.id, self.dDevice.name, value);
            self.batteryService.getCharacteristic(self.Characteristic.StatusLowBattery).updateValue(!value, null);
        });
        return _this;
    }
    HBDevoloRoomThermostatDevice.prototype.getServices = function () {
        this.informationService = new this.Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(this.Characteristic.Manufacturer, 'Devolo')
            .setCharacteristic(this.Characteristic.Model, 'Room Thermostat')
            .setCharacteristic(this.Characteristic.SerialNumber, this.dDevice.id.replace('/', '-'));
        this.thermostatService = new this.Service.Thermostat(this.name);
        this.thermostatService.setCharacteristic(this.Characteristic.CurrentHeatingCoolingState, 1); //heating
        this.thermostatService.setCharacteristic(this.Characteristic.TargetHeatingCoolingState, 1); //heating
        this.thermostatService.setCharacteristic(this.Characteristic.TemperatureDisplayUnits, 0); //celcius
        this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature).setProps({
            minValue: 4,
            maxValue: 28,
            minStep: 0.5
        });
        this.thermostatService.getCharacteristic(this.Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));
        this.thermostatService.getCharacteristic(this.Characteristic.TargetTemperature)
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));
        this.batteryService = new this.Service.BatteryService(this.name);
        this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel)
            .on('get', this.getBatteryLevel.bind(this));
        this.batteryService.getCharacteristic(this.Characteristic.ChargingState)
            .on('get', this.getChargingState.bind(this));
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
            .on('get', this.getStatusLowBattery.bind(this));
        this.lastCurrentTemp = this.dDevice.getValue('temperature');
        this.lastTargetTemp = this.dDevice.getTargetValue('temperature');
        var services = [this.informationService, this.thermostatService, this.batteryService];
        // START FakeGato (eve app)
        if (this.config.fakeGato) {
            this._addFakeGatoHistory('thermo', false);
            services = services.concat([this.loggingService]);
        }
        // END FakeGato (eve app)
        this.dDevice.listen();
        return services;
    };
    HBDevoloRoomThermostatDevice.prototype.getCurrentTemperature = function (callback) {
        this.apiGetCurrentTemperature = this.dDevice.getValue('temperature');
        this.log.debug('%s (%s / %s) > getCurrentTemperature is %s', this.constructor.name, this.dDevice.id, this.dDevice.name, this.apiGetCurrentTemperature);
        return callback(null, this.apiGetCurrentTemperature);
    };
    HBDevoloRoomThermostatDevice.prototype.getTargetTemperature = function (callback) {
        this.apiGetTargetTemperature = this.dDevice.getTargetValue('temperature');
        this.log.debug('%s (%s / %s) > getTargetTemperature is %s', this.constructor.name, this.dDevice.id, this.dDevice.name, this.apiGetTargetTemperature);
        return callback(null, this.apiGetTargetTemperature);
    };
    HBDevoloRoomThermostatDevice.prototype.setTargetTemperature = function (value, callback) {
        this.log.debug('%s (%s / %s) > setTargetTemperature to %s', this.constructor.name, this.dDevice.id, this.dDevice.name, value);
        if (value == this.dDevice.getTargetValue('temperature')) {
            callback();
            return;
        }
        var self = this;
        this.dDevice.setTargetValue('temperature', value, function (err) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        }, true);
    };
    HBDevoloRoomThermostatDevice.prototype.getBatteryLevel = function (callback) {
        this.apiGetBatteryLevel = this.dDevice.getBatteryLevel();
        this.log.debug('%s (%s / %s) > getBatteryLevel is %s', this.constructor.name, this.dDevice.id, this.dDevice.name, this.apiGetBatteryLevel);
        return callback(null, this.apiGetBatteryLevel);
    };
    HBDevoloRoomThermostatDevice.prototype.getStatusLowBattery = function (callback) {
        this.apiGetStatusLowBattery = !this.dDevice.getBatteryLow();
        this.log.debug('%s (%s / %s) > getStatusLowBattery is %s', this.constructor.name, this.dDevice.id, this.dDevice.name, this.apiGetStatusLowBattery);
        return callback(null, this.apiGetStatusLowBattery);
    };
    HBDevoloRoomThermostatDevice.prototype.getChargingState = function (callback) {
        this.apiGetChargingState = false;
        this.log.debug('%s (%s / %s) > getChargingState is %s', this.constructor.name, this.dDevice.id, this.dDevice.name, this.apiGetChargingState);
        return callback(null, this.apiGetChargingState);
    };
    // START FakeGato (eve app)
    HBDevoloRoomThermostatDevice.prototype.onAfterFakeGatoHistoryLoaded = function () {
        // initial state post homebridge-restart, otherwise no graph
        this._addFakeGatoEntry({ currentTemp: this.dDevice.getValue('temperature'), setTemp: this.dDevice.getTargetValue('temperature') });
    };
    return HBDevoloRoomThermostatDevice;
}(HBDevoloDevice_1.HBDevoloDevice));
exports.HBDevoloRoomThermostatDevice = HBDevoloRoomThermostatDevice;
