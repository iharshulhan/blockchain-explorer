/* eslint-disable prefer-destructuring */
/*
    SPDX-License-Identifier: Apache-2.0
*/

const path = require('path');
const fs = require('fs-extra');

const SyncService = require('../sync/SyncService');
const IrohaUtils = require('../utils/IrohaUtils');
const FabricEvent = require('./FabricEvent');

const helper = require('../../../common/helper');

const logger = helper.getLogger('SyncPlatform');
const ExplorerError = require('../../../common/ExplorerError');

const CRUDService = require('../../../persistence/fabric/CRUDService');
const MetricService = require('../../../persistence/fabric/MetricService');

const irohaConst = require('../utils/IrohaConst').iroha.const;
const explorer_mess = require('../../../common/ExplorerMessage').explorer;

const config_path = path.resolve(__dirname, '../config.json');

class SyncPlatform {
  constructor(persistence, sender) {
    this.sender = sender;
    this.persistence = persistence;
    this.syncService = new SyncService(this, this.persistence);
    this.blocksSyncTime = 60000;
  }

  async initialize(args) {
    logger.debug(
      '******* Initialization started for child client process %s ******',
      this.client_name
    );
    // loading the config.json
    const allConfig = JSON.parse(fs.readFileSync(config_path, 'utf8'));
    const networkConfigs = allConfig[irohaConst.NETWORK_CONFIGS];

    if (args.length === 0) {
      // get the first network and first client
      this.network_name = Object.keys(networkConfigs)[0];
      this.client_name = Object.keys(
        networkConfigs[Object.keys(networkConfigs)[0]].clients
      )[0];
    } else if (args.length === 1) {
      // get the first client with respect to the passed network name
      this.network_name = args[0];
      this.client_name = Object.keys(
        networkConfigs[this.network_name].clients
      )[0];
    } else {
      this.network_name = args[0];
      this.client_name = args[1];
    }

    // TODO: Check the structure properly

    this.privateKey = fs.readFileSync(
      networkConfigs[this.network_name].clients[this.client_name]
        .adminPrivateKey.path,
      'utf8'
    );
    this.publicKey = fs.readFileSync(
      networkConfigs[this.network_name].clients[this.client_name].adminPublicKey
        .path,
      'utf8'
    );
    this.peerAddr = Object.keys(networkConfigs[this.network_name].peers)[0];
    this.client_name =
      networkConfigs[this.network_name].clients[this.client_name].name;

    console.log('SyncPlatfrom initialisation');
    console.log(this);

    console.log(
      IrohaUtils.login(
        this.client_name,
        this.privateKey,
        this.peerAddr,
        this.publicKey
      )
    );
  }

  async isChannelEventHubConnected() {
    // for (const [channel_name, channel] of this.client.getChannels().entries()) {
    //   // validate channel event is connected
    //   const status = this.eventHub.isChannelEventHubConnected(channel_name);
    //   if (status) {
    //     await this.syncService.synchBlocks(this.client, channel);
    //   } else {
    //     // channel client is not connected then it will reconnect
    //     this.eventHub.connectChannelEventHub(channel_name);
    //   }
    // }
  }

  setBlocksSyncTime(blocksSyncTime) {
    if (blocksSyncTime) {
      const time = parseInt(blocksSyncTime, 10);
      if (!isNaN(time)) {
        // this.blocksSyncTime = 1 * 10 * 1000;
        this.blocksSyncTime = time * 60 * 1000;
      }
    }
  }

  setPersistenceService() {
    // setting platfrom specific CRUDService and MetricService
    this.persistence.setMetricService(
      new MetricService(this.persistence.getPGService())
    );
    this.persistence.setCrudService(
      new CRUDService(this.persistence.getPGService())
    );
  }

  send(notify) {
    if (this.sender) {
      this.sender.send(notify);
    }
  }

  destroy() {
    if (this.eventHub) {
      this.eventHub.disconnectEventHubs();
    }
  }
}

module.exports = SyncPlatform;
