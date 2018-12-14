/**
 *    SPDX-License-Identifier: Apache-2.0
 */

const helper = require('../../common/helper');

const logger = helper.getLogger('MetricService');

class MetricService {
  constructor(sql) {
    this.sql = sql;
  }

  //= =========================query counts ==========================
  getChaincodeCount(_channelHash) {
    return this.sql.getRowsBySQlCase(
      `select count(1) c from chaincodes where _channelHash='${_channelHash}' `
    );
  }

  getPeerlistCount(_channelHash) {
    return this.sql.getRowsBySQlCase(
      `select count(1) c from peer where _channelHash='${_channelHash}' `
    );
  }

  getTxCount(_channelHash) {
    return this.sql.getRowsBySQlCase(
      `select count(1) c from transactions where _channelHash='${_channelHash}'`
    );
  }

  getBlockCount(_channelHash) {
    return this.sql.getRowsBySQlCase(
      `select count(1) c from blocks where _channelHash='${_channelHash}'`
    );
  }

  async getPeerData(_channelHash) {
    const peerArray = [];
    const c1 = await this.sql
      .getRowsBySQlNoCondtion(`select channel.name as channelName,c.requests as requests,c._channelHash as _channelHash ,
    c.server_hostname as server_hostname, c.mspid as mspid, c.peer_type as peer_type  from peer as c inner join  channel on
    c._channelHash=channel._channelHash where c._channelHash='${_channelHash}'`);
    for (let i = 0, len = c1.length; i < len; i++) {
      const item = c1[i];
      peerArray.push({
        name: item.channelName,
        requests: item.requests,
        server_hostname: item.server_hostname,
        _channelHash: item._channelHash,
        mspid: item.mspid,
        peer_type: item.peer_type
      });
    }
    return peerArray;
  }

  // BE -303
  async getOrdererData() {
    const ordererArray = [];
    const c1 = await this.sql.getRowsBySQlNoCondtion(
      'select c.requests as requests,c.server_hostname as server_hostname,c._channelHash as _channelHash from orderer c'
    );
    for (let i = 0, len = c1.length; i < len; i++) {
      const item = c1[i];
      ordererArray.push({
        requests: item.requests,
        server_hostname: item.server_hostname,
        _channelHash: item._channelHash
      });
    }
    return ordererArray;
  }

  // BE -303
  async getTxPerChaincodeGenerate(_channelHash) {
    const txArray = [];
    const c = await this.sql
      .getRowsBySQlNoCondtion(`select  c.name as chaincodename,channel.name as channelName ,c.version as version,c._channelHash
       as _channelHash,c.path as path ,txcount  as c from chaincodes as c inner join channel on c._channelHash=channel._channelHash where  c._channelHash='${_channelHash}' `);
    if (c) {
      c.forEach((item, index) => {
        txArray.push({
          _channelHash: item._channelHash,
          chaincodename: item.chaincodename,
          path: item.path,
          version: item.version,
          txCount: item.c,
          _channelHash: item._channelHash
        });
      });
    }
    return txArray;
  }

  async getOrgsData(_channelHash) {
    const orgs = [];
    const rows = await this.sql.getRowsBySQlNoCondtion(
      `select distinct on (mspid) mspid from peer  where _channelHash='${_channelHash}'`
    );
    for (let i = 0, len = rows.length; i < len; i++) {
      orgs.push(rows[i].mspid);
    }
    return orgs;
  }

  async getTxPerChaincode(_channelHash, cb) {
    try {
      const txArray = await this.getTxPerChaincodeGenerate(_channelHash);
      cb(txArray);
    } catch (err) {
      logger.error(err);
      cb([]);
    }
  }

  async getStatusGenerate(_channelHash) {
    let chaincodeCount = await this.getChaincodeCount(_channelHash);
    if (!chaincodeCount) chaincodeCount = 0;
    let txCount = await this.getTxCount(_channelHash);
    if (!txCount) txCount = 0;
    txCount.c = txCount.c ? txCount.c : 0;
    let blockCount = await this.getBlockCount(_channelHash);
    if (!blockCount) blockCount = 0;
    blockCount.c = blockCount.c ? blockCount.c : 0;
    let peerCount = await this.getPeerlistCount(_channelHash);
    if (!peerCount) peerCount = 0;
    peerCount.c = peerCount.c ? peerCount.c : 0;
    return {
      chaincodeCount: chaincodeCount.c,
      txCount: txCount.c,
      latestBlock: blockCount.c,
      peerCount: peerCount.c
    };
  }

  async getStatus(_channelHash, cb) {
    try {
      const data = await this.getStatusGenerate(_channelHash);
      cb(data);
    } catch (err) {
      logger.error(err);
    }
  }

  async getPeerList(_channelHash, cb) {
    try {
      const peerArray = await this.getPeerData(_channelHash);
      if (cb) {
        cb(peerArray);
      } else {
        return peerArray;
      }
    } catch (err) {
      logger.error(err);
      cb([]);
    }
  }

  // BE -303
  async getOrdererList(cb) {
    try {
      const ordererArray = await this.getOrdererData();
      cb(ordererArray);
    } catch (err) {
      logger.error(err);
      cb([]);
    }
  }
  // BE -303
  // transaction metrics

  getTxByMinute(_channelHash, hours) {
    const sqlPerMinute = ` with minutes as (
            select generate_series(
              date_trunc('min', now()) - '${hours}hour'::interval,
              date_trunc('min', now()),
              '1 min'::interval
            ) as datetime
          )
          select
            minutes.datetime,
            count(createdt)
          from minutes
          left join TRANSACTIONS on date_trunc('min', TRANSACTIONS.createdt) = minutes.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerMinute);
  }

  getTxByHour(_channelHash, day) {
    const sqlPerHour = ` with hours as (
            select generate_series(
              date_trunc('hour', now()) - '${day}day'::interval,
              date_trunc('hour', now()),
              '1 hour'::interval
            ) as datetime
          )
          select
            hours.datetime,
            count(createdt)
          from hours
          left join TRANSACTIONS on date_trunc('hour', TRANSACTIONS.createdt) = hours.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerHour);
  }

  getTxByDay(_channelHash, days) {
    const sqlPerDay = ` with days as (
            select generate_series(
              date_trunc('day', now()) - '${days}day'::interval,
              date_trunc('day', now()),
              '1 day'::interval
            ) as datetime
          )
          select
            days.datetime,
            count(createdt)
          from days
          left join TRANSACTIONS on date_trunc('day', TRANSACTIONS.createdt) =days.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerDay);
  }

  getTxByWeek(_channelHash, weeks) {
    const sqlPerWeek = ` with weeks as (
            select generate_series(
              date_trunc('week', now()) - '${weeks}week'::interval,
              date_trunc('week', now()),
              '1 week'::interval
            ) as datetime
          )
          select
            weeks.datetime,
            count(createdt)
          from weeks
          left join TRANSACTIONS on date_trunc('week', TRANSACTIONS.createdt) =weeks.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerWeek);
  }

  getTxByMonth(_channelHash, months) {
    const sqlPerMonth = ` with months as (
            select generate_series(
              date_trunc('month', now()) - '${months}month'::interval,
              date_trunc('month', now()),
              '1 month'::interval
            ) as datetime
          )

          select
            months.datetime,
            count(createdt)
          from months
          left join TRANSACTIONS on date_trunc('month', TRANSACTIONS.createdt) =months.datetime  and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerMonth);
  }

  getTxByYear(_channelHash, years) {
    const sqlPerYear = ` with years as (
            select generate_series(
              date_trunc('year', now()) - '${years}year'::interval,
              date_trunc('year', now()),
              '1 year'::interval
            ) as year
          )
          select
            years.year,
            count(createdt)
          from years
          left join TRANSACTIONS on date_trunc('year', TRANSACTIONS.createdt) =years.year and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerYear);
  }

  // block metrics API

  getBlocksByMinute(_channelHash, hours) {
    const sqlPerMinute = ` with minutes as (
            select generate_series(
              date_trunc('min', now()) - '${hours} hour'::interval,
              date_trunc('min', now()),
              '1 min'::interval
            ) as datetime
          )
          select
            minutes.datetime,
            count(createdt)
          from minutes
          left join BLOCKS on date_trunc('min', BLOCKS.createdt) = minutes.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1  `;

    return this.sql.getRowsBySQlQuery(sqlPerMinute);
  }

  getBlocksByHour(_channelHash, days) {
    const sqlPerHour = ` with hours as (
            select generate_series(
              date_trunc('hour', now()) - '${days}day'::interval,
              date_trunc('hour', now()),
              '1 hour'::interval
            ) as datetime
          )
          select
            hours.datetime,
            count(createdt)
          from hours
          left join BLOCKS on date_trunc('hour', BLOCKS.createdt) = hours.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerHour);
  }

  getBlocksByDay(_channelHash, days) {
    const sqlPerDay = `  with days as (
            select generate_series(
              date_trunc('day', now()) - '${days}day'::interval,
              date_trunc('day', now()),
              '1 day'::interval
            ) as datetime
          )
          select
            days.datetime,
            count(createdt)
          from days
          left join BLOCKS on date_trunc('day', BLOCKS.createdt) =days.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerDay);
  }

  getBlocksByWeek(_channelHash, weeks) {
    const sqlPerWeek = ` with weeks as (
            select generate_series(
              date_trunc('week', now()) - '${weeks}week'::interval,
              date_trunc('week', now()),
              '1 week'::interval
            ) as datetime
          )
          select
            weeks.datetime,
            count(createdt)
          from weeks
          left join BLOCKS on date_trunc('week', BLOCKS.createdt) =weeks.datetime and _channelHash ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerWeek);
  }

  getBlocksByMonth(_channelHash, months) {
    const sqlPerMonth = `  with months as (
            select generate_series(
              date_trunc('month', now()) - '${months}month'::interval,
              date_trunc('month', now()),
              '1 month'::interval
            ) as datetime
          )
          select
            months.datetime,
            count(createdt)
          from months
          left join BLOCKS on date_trunc('month', BLOCKS.createdt) =months.datetime and _channelHash  ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerMonth);
  }

  getBlocksByYear(_channelHash, years) {
    const sqlPerYear = ` with years as (
            select generate_series(
              date_trunc('year', now()) - '${years}year'::interval,
              date_trunc('year', now()),
              '1 year'::interval
            ) as year
          )
          select
            years.year,
            count(createdt)
          from years
          left join BLOCKS on date_trunc('year', BLOCKS.createdt) =years.year and _channelHash  ='${_channelHash}'
          group by 1
          order by 1 `;

    return this.sql.getRowsBySQlQuery(sqlPerYear);
  }

  getTxByOrgs(_channelHash) {
    const sqlPerOrg = ` select count(creator_msp_id), creator_msp_id
      from transactions
      where _channelHash ='${_channelHash}'
      group by  creator_msp_id`;

    return this.sql.getRowsBySQlQuery(sqlPerOrg);
  }

  async findMissingBlockNumber(_channelHash, maxHeight) {
    const sqlQuery = `SELECT s.id AS missing_id
    FROM generate_series(0, ${maxHeight}) s(id) WHERE NOT EXISTS (SELECT 1 FROM blocks WHERE blocknum = s.id and _channelHash ='${_channelHash}' )`;

    return this.sql.getRowsBySQlQuery(sqlQuery);
  }
}

module.exports = MetricService;
