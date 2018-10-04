import { HBDevoloDevice } from '../HBDevoloDevice';
import { Devolo } from 'node-devolo/dist/Devolo';
import { Device } from 'node-devolo/dist/DevoloDevice';

export class HBOtherRelaySwitchXDevice extends HBDevoloDevice {

    switchServices = [];

    constructor(log, dAPI: Devolo, dDevice: Device, storage, config) {
        super(log, dAPI, dDevice, storage, config);
        var self = this;
        self.dDevice.events.on('onStateChanged', function(state: number, num:number) {
            self.log.info('%s (%s [%s] / %s) > onStateChanged > State is %s', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name, state);
            self.switchServices[num-1].getCharacteristic(self.Characteristic.On).updateValue(state, null);
        });
        self.dDevice.events.on('onCurrentValueChanged', function(type: string, value: number, num:number) {
            if(type==='energy') {
                self.log.info('%s (%s [%s] / %s) > onCurrentValueChanged > CurrentConsumption is %s', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name, value);
                self.switchServices[num-1].getCharacteristic(self.Characteristic.CurrentConsumption).updateValue(value, null);
            }
        });
        self.dDevice.events.on('onTotalValueChanged', function(type: string, value: number, num:number) {
            if(type==='energy') {
                self.log.info('%s (%s [%s] / %s) > onTotalValueChanged > TotalConsumption is %s', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name, value);
                self.switchServices[num-1].getCharacteristic(self.Characteristic.TotalConsumption).updateValue(value, null);
            }
        });
        self.dDevice.events.on('onSinceTimeChanged', function(type: string, value: number, num:number) {
            if(type==='energy') {
                self.log.info('%s (%s [%s] / %s) > onSinceTimeChanged > TotalConsumptionSince is %s', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name, value);
                self.switchServices[num-1].getCharacteristic(self.Characteristic.TotalConsumptionSince).updateValue(new Date(value).toISOString().replace(/T/, ' ').replace(/\..+/, ''), null);
            }
        });
    }

    getServices() {
        this.informationService = new this.Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(this.Characteristic.Manufacturer, 'Other')
            .setCharacteristic(this.Characteristic.Model, 'Single-Double-Triple-Quattro Relay-Switch')
            .setCharacteristic(this.Characteristic.SerialNumber, this.dDevice.id.replace('/','-'))

        let sensorCount = 1;
        let sensorCountArray = 0;
        for(let i=0; i<this.dDevice.sensors.length; i++) {
            let sensor = this.dDevice.sensors[i];
            if(sensor.id.indexOf('BinarySwitch') > -1) {

                if(!this.config.switchBlacklistDoubleRelaySwitch || !this._isInList(this.name + ' ' + sensorCount, this.config.switchBlacklistDoubleRelaySwitch)) {

                    this.log.debug('Initializing platform accessory \'%s\' with switch %s (homekitSensor: %s)', this.dDevice.name, sensorCount, sensorCountArray);

                    this.switchServices.push(new this.Service.Outlet(this.name + ' ' + sensorCount, this.name + ' ' + sensorCount));
                    this.switchServices[sensorCountArray].getCharacteristic(this.Characteristic.On)
                                 .on('get', this.getSwitchState.bind([this, sensorCount]))
                                 .on('set', this.setSwitchState.bind([this, sensorCount]));
                    this.switchServices[sensorCountArray].addCharacteristic(this.Characteristic.DevoloCurrentConsumption)
                                .on('get', this.getDevoloCurrentConsumption.bind([this, sensorCount]))
                    this.switchServices[sensorCountArray].addCharacteristic(this.Characteristic.DevoloTotalConsumption)
                                .on('get', this.getDevoloTotalConsumption.bind([this, sensorCount]))
                    this.switchServices[sensorCountArray].addCharacteristic(this.Characteristic.DevoloTotalConsumptionSince)
                                .on('get', this.getDevoloTotalConsumptionSince.bind([this, sensorCount]))

                    sensorCountArray++;
                }

                sensorCount++;
            }
        }

        this.dDevice.listen();
        return [this.informationService].concat(this.switchServices);
    }

    getSwitchState(callback) {
        var self = this[0];
        var num = this[1];
        self.log.debug('%s (%s [%s] / %s) > getSwitchState', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name);
        return callback(null, self.dDevice.getState(num)!=0);
    }

    getDevoloCurrentConsumption(callback) {
        var self = this[0];
        var num = this[1];
        self.log.debug('%s (%s [%s] / %s) > getDevoloCurrentConsumption', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name);
        return callback(null, self.dDevice.getCurrentValue('energy', num));
    }

    getDevoloTotalConsumption(callback) {
        var self = this[0];
        var num = this[1];
        self.log.debug('%s (%s [%s] / %s) > getDevoloTotalConsumption', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name);
        return callback(null, self.dDevice.getTotalValue('energy', num));
    }

    getDevoloTotalConsumptionSince(callback) {
        var self = this[0];
        var num = this[1];
        self.log.debug('%s (%s [%s] / %s) > getDevoloTotalConsumptionSince', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name);
        return callback(null, new Date(self.dDevice.getSinceTime('energy', num)).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
    }

    setSwitchState(value, callback) {
        var self = this[0];
        var num = this[1];
        self.log.debug('%s (%s [%s] / %s) > setSwitchState to %s', (self.constructor as any).name, self.dDevice.id, num, self.dDevice.name, value);
        if(value==self.dDevice.getState(num)) {
            callback();
            return;
        }
        if(value) {
            self.dDevice.turnOn(function(err) {
                if(err) {
                    callback(err); return;
                }
                callback();
            }, num);
        }
        else {
            self.dDevice.turnOff(function(err) {
                if(err) {
                    callback(err); return;
                }
                callback();
            }, num);
        }
    }
}