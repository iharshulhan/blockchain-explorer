/**
 *    SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');
const fs = require('fs-extra');

const Proxy = require('./Proxy');
const helper = require('../../common/helper');
const ExplorerError = require('../../common/ExplorerError');

const logger = helper.getLogger('Platform');
const ExplorerListener = require('../../sync/listener/ExplorerListener');

const CRUDService = require('../../persistence/fabric/CRUDService');
const MetricService = require('../../persistence/fabric/MetricService');

const irohaConst = require('./utils/IrohaConst').iroha.const;
const IrohaUtils = require('./utils/IrohaUtils');
const explorerError = require('../../common/ExplorerMessage').explorer.error;

const configPath = path.resolve(__dirname, './config.json');

class Platform {
  constructor(persistence, broadcaster) {
    this.persistence = persistence;
    this.broadcaster = broadcaster;
    this.networks = new Map();
    this.proxy = new Proxy(this);
    this.explorerListeners = [];
  }

  async initialize() {
    console.log('##### Platform initialize called\n\n');
    // loading the config.json
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const networkConfigs = config[irohaConst.NETWORK_CONFIGS];
    this.syncType = config.syncType;

    // build client context
    logger.debug(
      '******* Initialization started for Hyperledger Iroha platform ******'
    );

    await this.buildClients(networkConfigs);

    // if (
    //   this.networks.size === 0
    //   && this.networks.get(this.defaultNetwork).size === 0
    // ) {
    //   logger.error(
    //     '************* There is no client found for Hyperledger Iroha platform *************'
    //   );
    //   throw new ExplorerError(explorerError.ERROR_2008);
    // }
  }

  async buildClients(networkConfigs) {
    console.log('##### Platform Build clients called\n\n');
    // let clientStatus = true;
    //
    // // setting organization enrolment files
    // logger.debug('Setting admin organization enrolment files');
    // try {
    //   this.network_configs = await IrohaUtils.setAdminCertPath(
    //     networkConfigs
    //   );
    // } catch (e) {
    //   logger.error(e);
    //   clientStatus = false;
    //   this.network_configs = networkConfigs;
    // }
    //
    // for (const networkName in this.network_configs) {
    //   this.networks.set(networkName, new Map());
    //   const clientConfigs = this.network_configs[networkName];
    //   if (!this.defaultNetwork) {
    //     this.defaultNetwork = networkName;
    //   }
    //
    //   // Create iroha explorer client for each
    //   // Each client is connected to only a single peer and monitor that particular peer only
    //   for (const clientName in clientConfigs.clients) {
    //     // set default client as first client
    //     if (!this.defaultClient) {
    //       this.defaultClient = clientName;
    //     }
    //
    //     // create client instance
    //     logger.debug('Creatinging client [%s] >> ', clientName);
    //     let client;
    //
    //     if (clientStatus) {
    //       client = await IrohaUtils.createIrohaClient(
    //         clientConfigs,
    //         clientName,
    //         this.persistence
    //       );
    //     } else {
    //       client = await IrohaUtils.createDetachClient(
    //         clientConfigs,
    //         clientName,
    //         this.persistence
    //       );
    //     }
    //     if (client) {
    //       // set client into clients map
    //       const clients = this.networks.get(networkName);
    //       clients.set(clientName, client);
    //     }
    //   }
    // }
  }

  initializeListener(syncconfig) {
    console.log('##### Platform initializeListener called\n\n');
    const explorerListener = new ExplorerListener(this, syncconfig);
    explorerListener.initialize(['network-1', 'admin', '1']);
    explorerListener.send('Successfully send a message to child process');
    this.explorerListeners.push(explorerListener);
    // for (const [network_name, clients] of this.networks.entries()) {
    //   for (const [client_name, client] of clients.entries()) {
    //     // if (this.getClient(network_name, client_name).getStatus()) {
    //
    //     }
    //   // }
    // }
  }

  setPersistenceService() {
    console.log('##### Platform setPersistenceService called\n\n');
    // setting platfrom specific CRUDService and MetricService
    this.persistence.setMetricService(
      new MetricService(this.persistence.getPGService())
    );
    this.persistence.setCrudService(
      new CRUDService(this.persistence.getPGService())
    );
  }

  // changeNetwork(network_name, client_name, channel_name) {
  //   const network = this.networks.get(network_name);
  //   if (network) {
  //     this.defaultNetwork = network_name;
  //     let client;
  //     if (client_name) {
  //       client = network.get(client_name);
  //       if (client) {
  //         this.defaultClient = client_name;
  //       } else {
  //         return `Client [${network_name}] is not found in network`;
  //       }
  //     } else {
  //       const iterator = network.values();
  //       client = iterator.next().value;
  //       if (!client) {
  //         return `Client [${network_name}] is not found in network`;
  //       }
  //     }
  //     if (channel_name) {
  //       client.setDefaultChannel(channel_name);
  //     }
  //   } else {
  //     return `Network [${network_name}] is not found`;
  //   }
  // }

  getNetworks() {
    console.log('##### Platform getNetworks called\n\n');
    return this.networks;
  }

  getClient(network_name, client_name) {
    console.log('##### Platform getClient called\n\n');
    return this.networks
      .get(network_name || this.defaultNetwork)
      .get(client_name || this.defaultClient);
  }

  getPersistence() {
    return this.persistence;
  }

  getBroadcaster() {
    return this.broadcaster;
  }

  getProxy() {
    return this.proxy;
  }

  setDefaultClient(defaultClient) {
    this.defaultClient = defaultClient;
  }

  async destroy() {
    console.log(
      '<<<<<<<<<<<<<<<<<<<<<<<<<< Closing explorer  >>>>>>>>>>>>>>>>>>>>>'
    );
    for (const explorerListener of this.explorerListeners) {
      explorerListener.close();
    }
  }
}
module.exports = Platform;
