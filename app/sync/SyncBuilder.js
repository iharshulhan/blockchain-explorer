/*
 *SPDX-License-Identifier: Apache-2.0
 */
const explorer_const = require('../common/ExplorerConst').explorer.const;
const explorer_error = require('../common/ExplorerMessage').explorer.error;
const ExplorerError = require('../common/ExplorerError');

class SyncBuilder {
  static async build(pltfrm, persistence, sender) {
    if (pltfrm === explorer_const.PLATFORM_FABRIC) {
      const SyncPlatform = require('../platform/fabric/sync/SyncPlatform');
      const platform = new SyncPlatform(persistence, sender);
      return platform;
    }
    if (pltfrm === explorer_const.PLATFORM_IROHA) {
      const SyncPlatform = require('../platform/iroha/sync/SyncPlatform');
      const platform = new SyncPlatform(persistence, sender);
      return platform;
    }
    throw new ExplorerError(explorer_error.ERROR_1005, pltfrm);
  }
}

module.exports = SyncBuilder;
