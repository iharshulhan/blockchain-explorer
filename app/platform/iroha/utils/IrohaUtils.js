const debug = require('debug')('iroha-util');
const iroha = require('iroha-lib');
const grpc = require('grpc');

/**
 * default timeout limit of queries
 */
const DEFAULT_TIMEOUT_LIMIT = 5000;

const endpointGrpc = require('iroha-lib/pb/endpoint_grpc_pb.js');
const pbEndpoint = require('iroha-lib/pb/endpoint_pb.js');
const pbResponse = require('iroha-lib/pb/qry_responses_pb.js');

const txBuilder = new iroha.ModelTransactionBuilder();
const queryBuilder = new iroha.ModelQueryBuilder();
const crypto = new iroha.ModelCrypto();

/*
 * ===== functions =====
 */

/**
 * getAccount https://hyperledger.github.io/iroha-api/#get-account
 * @param {String} accountId
 * @param nodeIp address of the node
 * @param keys
 */
function getAccount(accountId, nodeIp, keys) {
  debug('starting getAccount...');
  console.log(accountId, nodeIp, keys);
  return sendQuery(
    nodeIp,
    keys,
    () =>
      queryBuilder
        .creatorAccountId(accountId)
        .createdTime(Date.now())
        .queryCounter(1)
        .getAccount(accountId)
        .build(),
    (resolve, reject, responseName, response) => {
      if (responseName !== 'ACCOUNT_RESPONSE') {
        return reject(
          new Error(
            `Query response error: expected=ACCOUNT_RESPONSE, actual=${responseName}`
          )
        );
      }

      const account = response
        .getAccountResponse()
        .getAccount()
        .toObject();

      debug('account', account);

      resolve(account);
    }
  );
}

/**
 * login
 * @param {String} username
 * @param {String} privateKey length is 64
 * @param {String} nodeIp
 * @param publicKey
 */
function login(username, privateKey, nodeIp, publicKey) {
  debug('starting login...');

  if (privateKey.length !== 64) {
    return Promise.reject(new Error('privateKey should have length of 64'));
  }
  const keys = crypto.convertFromExisting(
    publicKey ||
      crypto
        .fromPrivateKey(privateKey)
        .publicKey()
        .hex(),
    privateKey
  );

  return getAccount(username, nodeIp, keys)
    .then(account => {
      debug('login succeeded!');
      return account;
    })
    .catch(err => {
      debug('login failed');
      throw err;
    });
}

/**
 * generate new keypair
 */
function generateKeypair() {
  const keypair = crypto.generateKeypair();
  const publicKey = keypair.publicKey().hex();
  const privateKey = keypair.privateKey().hex();

  return { publicKey, privateKey };
}

/*
 * ===== queries =====
 */
/**
 * wrapper function of queries
 * @param nodeIp
 * @param keys
 * @param {Function} buildQuery
 * @param {Function} onResponse
 * @param {Number} timeoutLimit timeoutLimit
 */
function sendQuery(
  nodeIp,
  keys,
  buildQuery = function() {},
  onResponse = function(resolve, reject, responseName, response) {},
  timeoutLimit = DEFAULT_TIMEOUT_LIMIT
) {
  return new Promise((resolve, reject) => {
    console.log(grpc.credentials.createInsecure());
    const queryClient = new endpointGrpc.QueryServiceClient(
      nodeIp,
      grpc.credentials.createInsecure()
    );
    const query = buildQuery();
    const protoQuery = makeProtoQueryWithKeys(query, keys);

    debug('submitting query...');
    debug('peer ip:', nodeIp);
    debug(
      'parameters:',
      JSON.stringify(protoQuery.toObject().payload, null, '  ')
    );
    debug('');
    console.log(
      'Submitting query',
      'parameters:',
      JSON.stringify(protoQuery.toObject().payload, null, '  ')
    );

    // grpc-node hangs against unresponsive server, which possibly occur when
    // invalid node IP is set. To avoid this problem, we use timeout timer.
    // c.f. https://github.com/grpc/grpc/issues/13163
    const timer = setTimeout(() => {
      queryClient.$channel.close();
      const err = new Error(
        'please check IP address OR your internet connection'
      );
      err.code = grpc.status.CANCELLED;
      reject(err);
    }, timeoutLimit);

    queryClient.find(protoQuery, (err, response) => {
      console.log('response', response, err);
      clearTimeout(timer);

      if (err) {
        return reject(err);
      }

      debug('submitted query successfully!');
      console.log('submitted query successfully!');

      const type = response.getResponseCase();
      const responseName = getProtoEnumName(
        pbResponse.QueryResponse.ResponseCase,
        'iroha.protocol.QueryResponse',
        type
      );

      onResponse(resolve, reject, responseName, response);
    });
  });
}

/**
 * getAccountTransactions https://hyperledger.github.io/iroha-api/#get-account-transactions
 * @param {String} accountId
 */
function getAccountTransactions(accountId) {
  debug('starting getAccountTransactions...');

  return sendQuery(
    () =>
      queryBuilder
        .creatorAccountId(accountId)
        .createdTime(Date.now())
        .queryCounter(1)
        .getAccountTransactions(accountId)
        .build(),
    (resolve, reject, responseName, response) => {
      console.log('TRANSACTIONS_RESPONSE');
      if (responseName !== 'TRANSACTIONS_RESPONSE') {
        return reject(
          new Error(
            `Query response error: expected=TRANSACTIONS_RESPONSE, actual=${responseName}`
          )
        );
      }

      const transactions = response.getTransactionsResponse().toObject()
        .transactionsList;

      debug('transactions', transactions);

      resolve(transactions);
    }
  );
}

/**
 * getAccountAssetTransactions https://hyperledger.github.io/iroha-api/#get-account-asset-transactions
 * @param {String} accountId
 * @param {String} assetId
 */
function getAccountAssetTransactions(accountId, assetId) {
  debug('starting getAccountAssetTransactions...');

  return sendQuery(
    () =>
      queryBuilder
        .creatorAccountId(accountId)
        .createdTime(Date.now())
        .queryCounter(1)
        .getAccountAssetTransactions(accountId, assetId)
        .build(),
    (resolve, reject, responseName, response) => {
      if (responseName !== 'TRANSACTIONS_RESPONSE') {
        return reject(
          new Error(
            `Query response error: expected=TRANSACTIONS_RESPONSE, actual=${responseName}`
          )
        );
      }

      const transactions = response.getTransactionsResponse().toObject()
        .transactionsList;

      debug('transactions', transactions);

      resolve(transactions);
    }
  );
}

/**
 * getAccountAssets https://hyperledger.github.io/iroha-api/#get-account-assets
 * @param {String} accountId
 */
function getAccountAssets(accountId) {
  debug('starting getAccountAssets...');

  return sendQuery(
    () =>
      queryBuilder
        .creatorAccountId(accountId)
        .createdTime(Date.now())
        .queryCounter(1)
        .getAccountAssets(accountId)
        .build(),
    (resolve, reject, responseName, response) => {
      if (responseName !== 'ACCOUNT_ASSETS_RESPONSE') {
        return reject(
          new Error(
            `Query response error: expected=ACCOUNT_ASSETS_RESPONSE, actual=${responseName}`
          )
        );
      }

      const assets = response.getAccountAssetsResponse().toObject()
        .accountAssetsList;

      debug('assets', assets);

      resolve(assets);
    }
  );
}

/**
 * getAssetInfo https://hyperledger.github.io/iroha-api/?protobuf#get-asset-info
 * @param accountId
 * @param {String} assetId
 */
function getAssetInfo(accountId, assetId) {
  debug('starting getAssetInfo...');

  return sendQuery(
    () =>
      queryBuilder
        .creatorAccountId(accountId)
        .createdTime(Date.now())
        .queryCounter(1)
        .getAssetInfo(assetId)
        .build(),
    (resolve, reject, responseName, response) => {
      if (responseName !== 'ASSET_RESPONSE') {
        return reject(
          new Error(
            `Query response error: expected=ASSET_RESPONSE, actual=${responseName}`
          )
        );
      }

      const info = response.getAssetResponse().toObject();

      debug('asset info', info);

      resolve(info);
    }
  );
}

/*
 * ===== commands =====
 */
/**
 * wrapper function of commands
 * @param nodeIp
 * @param keys
 * @param buildTx
 * @param {Number} timeoutLimit timeoutLimit
 */
function command(
  nodeIp,
  keys,
  buildTx = function() {},
  timeoutLimit = DEFAULT_TIMEOUT_LIMIT
) {
  let txClient, txHash;

  return new Promise((resolve, reject) => {
    const tx = buildTx();
    const protoTx = makeProtoTxWithKeys(tx, keys);

    txClient = new endpointGrpc.CommandServiceClient(
      nodeIp,
      grpc.credentials.createInsecure()
    );
    txHash = blob2array(tx.hash().blob());

    debug('submitting transaction...');
    debug('peer ip:', nodeIp);
    debug(
      'parameters:',
      JSON.stringify(protoTx.toObject().payload, null, '  ')
    );
    debug('txhash:', Buffer.from(txHash).toString('hex'));
    debug('');

    const timer = setTimeout(() => {
      txClient.$channel.close();
      reject(new Error('please check IP address OR your internet connection'));
    }, timeoutLimit);

    txClient.torii(protoTx, (err, data) => {
      clearTimeout(timer);

      if (err) {
        return reject(err);
      }

      debug('submitted transaction successfully!');
      resolve();
    });
  })
    .then(() => {
      debug('sleep 5 seconds...');
      return sleep(5000);
    })
    .then(() => {
      debug('sending transaction status request...');

      return new Promise((resolve, reject) => {
        const request = new pbEndpoint.TxStatusRequest();

        request.setTxHash(txHash);

        txClient.status(request, (err, response) => {
          if (err) {
            return reject(err);
          }

          const status = response.getTxStatus();
          const TxStatus = require('iroha-lib/pb/endpoint_pb.js').TxStatus;
          const statusName = getProtoEnumName(
            TxStatus,
            'iroha.protocol.TxStatus',
            status
          );

          if (statusName !== 'COMMITTED') {
            return reject(
              new Error(
                `Your transaction wasn't commited: expected=COMMITED, actual=${statusName}`
              )
            );
          }

          resolve();
        });
      });
    });
}

/**
 * createAccount https://hyperledger.github.io/iroha-api/?protobuf#create-account
 * @param {String} accountName
 * @param {String} domainId
 * @param {String} mainPubKey
 */
function createAccount(creatorId, accountName, domainId, mainPubKey) {
  debug('starting createAccount...');

  return command(() =>
    txBuilder
      .creatorAccountId(creatorId)
      .createdTime(Date.now())
      .createAccount(accountName, domainId, mainPubKey)
      .build()
  );
}

/**
 * createAsset https://hyperledger.github.io/iroha-api/#create-asset
 * @param creatorId
 * @param {String} assetName
 * @param domainId
 * @param {Number} precision
 */
function createAsset(creatorId, assetName, domainId, precision) {
  debug('starting createAsset...');

  return command(() =>
    txBuilder
      .creatorAccountId(creatorId)
      .createdTime(Date.now())
      .createAsset(assetName, domainId, precision)
      .build()
  );
}

/**
 * addAssetQuantity https://hyperledger.github.io/iroha-api/#add-asset-quantity
 * @param creatorId
 * @param {String} accountId
 * @param {String} assetId
 * @param {String} amount
 */
function addAssetQuantity(creatorId, accountId, assetId, amount) {
  debug('starting addAssetQuantity...');

  return command(() =>
    txBuilder
      .creatorAccountId(creatorId)
      .createdTime(Date.now())
      .addAssetQuantity(accountId, assetId, amount)
      .build()
  );
}

/**
 * transferAsset https://hyperledger.github.io/iroha-api/#transfer-asset
 * @param creatorId
 * @param {String} srcAccountId
 * @param {String} destAccountId
 * @param {String} assetId
 * @param {String} description
 * @param {String} amount
 */
function transferAsset(
  creatorId,
  srcAccountId,
  destAccountId,
  assetId,
  description,
  amount
) {
  debug('starting transferAsset...');

  return command(() =>
    txBuilder
      .creatorAccountId(creatorId)
      .createdTime(Date.now())
      .transferAsset(srcAccountId, destAccountId, assetId, description, amount)
      .build()
  );
}

/*
 *  ===== utilities ===
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function blob2array(blob) {
  const bytearray = new Uint8Array(blob.size());
  for (let i = 0; i < blob.size(); ++i) {
    bytearray[i] = blob.get(i);
  }
  return bytearray;
}

const protoEnumName = {};
function getProtoEnumName(obj, key, value) {
  if (protoEnumName.hasOwnProperty(key)) {
    if (protoEnumName[key].length < value) {
      return 'unknown';
    }
    return protoEnumName[key][value];
  }
  protoEnumName[key] = [];
  for (const k in obj) {
    const idx = obj[k];
    if (isNaN(idx)) {
      debug(
        `getProtoEnumName:wrong enum value, now is type of ${typeof idx} should be integer`
      );
    } else {
      protoEnumName[key][idx] = k;
    }
  }
  return getProtoEnumName(obj, key, value);
}

function makeProtoQueryWithKeys(builtQuery, keys) {
  const pbQuery = require('iroha-lib/pb/queries_pb.js').Query;

  const blob = new iroha.ModelProtoQuery(builtQuery)
    .signAndAddSignature(keys)
    .finish()
    .blob();
  const arr = blob2array(blob);
  const protoQuery = pbQuery.deserializeBinary(arr);

  return protoQuery;
}

function makeProtoTxWithKeys(builtTx, keys) {
  const pbTransaction = require('iroha-lib/pb/block_pb.js').Transaction;

  const blob = new iroha.ModelProtoTransaction(builtTx)
    .signAndAddSignature(keys)
    .finish()
    .blob();
  const arr = blob2array(blob);
  const protoTx = pbTransaction.deserializeBinary(arr);

  return protoTx;
}

/*
 *  ===== export ===
 */
module.exports = {
  login,
  generateKeypair,

  // queries
  getAccount,
  getAccountAssets,
  getAccountAssetTransactions,
  getAccountTransactions,
  getAssetInfo,

  // commands
  createAccount,
  createAsset,
  transferAsset,
  addAssetQuantity
};
