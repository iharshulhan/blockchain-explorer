/*
    SPDX-License-Identifier: Apache-2.0
*/

const helper = require('../../common/helper');

const logger = helper.getLogger('Proxy');

const ExplorerError = require('../../common/ExplorerError');

const explorer_error = require('../../common/ExplorerMessage').explorer.error;

class Proxy {
  constructor(platform) {
    this.platform = platform;
    this.persistence = platform.getPersistence();
    this.broadcaster = platform.getBroadcaster();
  }

  async getCurrentChannel() {
    console.log('##### Proxy getCurrentChannel called\n\n');
    return {
      currentChannel: 'default'
    };
  }

  async loadChaincodeSrc(path) {
    console.log('##### Proxy loadChaincodeSrc called\n\n');
    return '';
  }

  async getPeersStatus(channel_genesis_hash) {
    console.log('##### Proxy getPeersStatus called\n\n');
    // TODO: Should be able to return status of peer in the network
    const peers = [{ status: 'RUNNING' }];
    return peers;
  }

  async changeChannel(channel_genesis_hash) {
    console.log('##### Proxy changeChannel called\n\n');
    const client = this.platform.getClient();
    const respose = client.setDefaultChannelByHash(channel_genesis_hash);
    logger.debug('changeChannel >> %s', respose);
    return respose;
  }

  async getChannelsInfo() {
    return [
      {
        id: 3,
        channelname: 'default',
        blocks: 5,
        channel_genesis_hash:
          'e34544c6ed016c06ceec840bee65d04952d921494181cf497f5f77a9ff4ed819',
        transactions: 5,
        createdat: '2018-12-12T14:19:30.000Z',
        channel_hash: ''
      }
    ];
  }

  async getTxByOrgs(channel_genesis_hash) {
    console.log('##### Proxy getTxByOrgs called\n\n');
    const rows = await this.persistence
      .getMetricService()
      .getTxByOrgs(channel_genesis_hash);
    const organizations = await this.persistence
      .getMetricService()
      .getOrgsData(channel_genesis_hash);

    for (const organization of rows) {
      const index = organizations.indexOf(organization.creator_msp_id);
      if (index > -1) {
        organizations.splice(index, 1);
      }
    }
    for (const org_id of organizations) {
      rows.push({ count: '0', creator_msp_id: org_id });
    }
    return rows;
  }

  async getBlockByNumber(channel_genesis_hash, number) {
    console.log('##### Proxy getBlockByNumber called\n\n');
    const client = this.platform.getClient();
    const channel = client.getChannelByHash(channel_genesis_hash);

    const block = channel.queryBlock(
      parseInt(number),
      client.getDefaultPeer().getName(),
      true
    );

    if (block) {
      return block;
    }
    logger.error('response_payloads is null');
    return 'response_payloads is null';
  }

  async createChannel(artifacts) {
    console.log('##### Proxy createChannel called\n\n');
    const client = this.platform.getClient();
    const respose = await client.createChannel(artifacts);
    return respose;
  }

  async joinChannel(channelName, peers, orgName) {
    console.log('##### Proxy joinChannel called\n\n');
    const client = this.platform.getClient();
    const respose = await client.joinChannel(channelName, peers, orgName);
    return respose;
  }

  getClientStatus() {
    console.log('##### Proxy getClientStatus called\n\n');
    const client = this.platform.getClient();
    return client.getStatus();
  }

  async getChannels() {
    console.log('##### Proxy getChannels called\n\n');
    return ['default'];
  }

  processSyncMessage(msg) {
    console.log('##### Proxy processSyncMessage called\n\n');
    // get message from child process
    logger.debug('Message from child %j', msg);
    if (fabric_const.NOTITY_TYPE_NEWCHANNEL === msg.notify_type) {
      // initialize new channel instance in parent
      if (msg.network_name && msg.client_name) {
        const client = this.platform.networks
          .get(msg.network_name)
          .get(msg.client_name);
        if (msg.channel_name) {
          client.initializeNewChannel(msg.channel_name);
        } else {
          logger.error(
            'Channel name should pass to proces the notification from child process'
          );
        }
      } else {
        logger.error(
          'Network name and client name should pass to proces the notification from child process'
        );
      }
    } else if (
      fabric_const.NOTITY_TYPE_UPDATECHANNEL === msg.notify_type ||
      fabric_const.NOTITY_TYPE_CHAINCODE === msg.notify_type
    ) {
      // update channel details in parent
      if (msg.network_name && msg.client_name) {
        const client = this.platform.networks
          .get(msg.network_name)
          .get(msg.client_name);
        if (msg.channel_name) {
          client.initializeChannelFromDiscover(msg.channel_name);
        } else {
          logger.error(
            'Channel name should pass to proces the notification from child process'
          );
        }
      } else {
        logger.error(
          'Network name and client name should pass to proces the notification from child process'
        );
      }
    } else if (fabric_const.NOTITY_TYPE_BLOCK === msg.notify_type) {
      // broad cast new block message to client
      const notify = {
        title: msg.title,
        type: msg.type,
        message: msg.message,
        time: msg.time,
        txcount: msg.txcount,
        datahash: msg.datahash
      };
      this.broadcaster.broadcast(notify);
    } else if (fabric_const.NOTITY_TYPE_EXISTCHANNEL === msg.notify_type) {
      throw new ExplorerError(explorer_error.ERROR_2009, msg.channel_name);
    } else if (msg.error) {
      throw new ExplorerError(explorer_error.ERROR_2010, msg.error);
    } else {
      logger.error(
        'Child process notify is not implemented for this type %s ',
        msg.notify_type
      );
    }
  }
}

module.exports = Proxy;
