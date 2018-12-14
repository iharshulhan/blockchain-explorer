/*
    SPDX-License-Identifier: Apache-2.0
*/

const fs = require('fs-extra');
const grpc = require('grpc');
const convertHex = require('convert-hex');
const helper = require('../../../common/helper');

const logger = helper.getLogger('SyncServices');
const ExplorerError = require('../../../common/ExplorerError');
const FabricUtils = require('../../../platform/fabric/utils/FabricUtils');
const fabric_const = require('../../../platform/fabric/utils/FabricConst')
  .fabric.const;
const explorer_error = require('../../../common/ExplorerMessage').explorer
  .error;

const _transProto = grpc.load(
  `${__dirname}/../../../../node_modules/fabric-client/lib/protos/peer/transaction.proto`
).protos;

const blocksInProcess = [];

// transaction validation code
const _validation_codes = {};
const keys = Object.keys(_transProto.TxValidationCode);
for (let i = 0; i < keys.length; i++) {
  const new_key = _transProto.TxValidationCode[keys[i]];
  _validation_codes[new_key] = keys[i];
}

class SyncServices {
  constructor(platform, persistence) {
    this.platform = platform;
    this.persistence = persistence;
    this.blocks = [];
    this.synchInProcess = [];
  }

  async initialize() {}

  async synchNetworkConfigToDB(client) {}

  async insertNewChannel(client, channel, block, channel_genesis_hash) {}

  async insertFromDiscoveryResults(client, channel, channel_genesis_hash) {}

  // insert new peer and channel relation
  async insertNewPeer(peer, channel_genesis_hash, client) {}

  // insert new orderer and channel relation
  async insertNewOrderers(orderer, channel_genesis_hash, client) {}

  // insert new chaincode relation with peer and channel
  async insertNewChaincodePeerRef(chaincode, endpoint, channel_genesis_hash) {}

  async synchBlocks(client, channel) {
    // TODO: get Information from Iroha about blocks
  }

  async processBlockEvent(client, block) {}

  getCurrentChannel() {}

  getPlatform() {
    return this.platform;
  }

  getPersistence() {
    return this.persistence;
  }
}

module.exports = SyncServices;
// transaction validation code
function convertValidationCode(code) {
  if (typeof code === 'string') {
    return code;
  }
  return _validation_codes[code];
}
