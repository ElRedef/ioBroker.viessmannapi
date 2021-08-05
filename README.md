![Logo](admin/viessmannapi.png)

# ioBroker.viessmannapi

[![NPM version](https://img.shields.io/npm/v/iobroker.viessmannapi.svg)](https://www.npmjs.com/package/iobroker.viessmannapi)
[![Downloads](https://img.shields.io/npm/dm/iobroker.viessmannapi.svg)](https://www.npmjs.com/package/iobroker.viessmannapi)
![Number of Installations (latest)](https://iobroker.live/badges/viessmannapi-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/viessmannapi-stable.svg)
[![Dependency Status](https://img.shields.io/david/TA2k/iobroker.viessmannapi.svg)](https://david-dm.org/TA2k/iobroker.viessmannapi)

[![NPM](https://nodei.co/npm/iobroker.viessmannapi.png?downloads=true)](https://nodei.co/npm/iobroker.viessmannapi/)

**Tests:** ![Test and Release](https://github.com/TA2k/ioBroker.viessmannapi/workflows/Test%20and%20Release/badge.svg)

## viessmannapi adapter for ioBroker

Adapter for Viessmannapi

Visit https://developer.viessmann.com/de/clients and create a new client.

Name: iobroker
deactivate Google reCAPTCHA
URI: http://localhost:4200/

Copy Client ID in the instance settings.

To change parameter set the state setValue
Example:

***viessmannapi.0.XXXXX.0.features.heating.dhw.temperature.main.commands.setTargetTemperature.setValue***

**Outdoor Temperature
viessmannapi.0.XXX.0.features.heating.sensors.temperature.outside.properties.value.value**

List of all available data points
https://developer.viessmann.com/de/doc/iot/data-points

## Changelog

### 2.0.0

-   (TA2k) initial release

## License

MIT License

Copyright (c) 2021 TA2k <tombox2020@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
