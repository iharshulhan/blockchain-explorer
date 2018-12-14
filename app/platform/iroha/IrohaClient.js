/*
    SPDX-License-Identifier: Apache-2.0
*/

const IrohaLib = require('iroha-lib');
const helper = require('../../common/helper');

const logger = helper.getLogger('IrohaClient');
const ExplorerError = require('../../common/ExplorerError');
const AdminPeer = require('./AdminPeer');
const grpc = require('grpc');

const explorer_mess = require('../../common/ExplorerMessage').explorer;

class IrohaClient {
  constructor(clientName) {
    this.client_name = clientName;
    this.defaultPeer = {};
    this.defaultChannel = {};
    this.defaultOrderer = null;
    this.channelsGenHash = new Map();
    this.adminpeers = new Map();
    this.adminusers = new Map();
    this.peerroles = {};
    this.status = false;
  }

  async initialize(clientConfig, persistence) {
    this.client_config = clientConfig;

    // Loading client from network configuration file
    logger.debug(
      'Loading client  [%s] from configuration ...',
      this.client_name
    );
    await this.LoadClientFromConfig(clientConfig);
    logger.debug(
      'Successfully loaded client [%s] from configuration',
      this.client_name
    );

    if (persistence) {
      this.initializeDetachClient(clientConfig, persistence);
    }
  }

  async initializeDetachClient(clientConfig, persistence) {
    this.client_config = clientConfig;
  }

  async LoadClientFromConfig(clientConfig) {}
}

module.exports = IrohaClient;
