const Api = require('poloniex-api-node')
const _ = require('lodash')

const Pair = require('../../lib/pair')

const { key, secret } = require('../getKeys')('poloniex')
const plnx = new Api(key, secret)

/**
 * NOTE: When dealing with pairs, they must be flipped before returned.
 */

class Poloniex {

  buy() {
    return privateMethods.addOrder.apply(this, ['buy', ...arguments])
  }

  sell() {
    return privateMethods.addOrder.apply(this, ['sell', ...arguments])
  }

  balances(account) {
    return new Promise((resolve, reject) => {
      plnx.returnCompleteBalances(account)
        .then( currencies => {
          resolve(
            _.map(currencies, (data, asset) => {
              let available = parseFloat(data.available)
              let pending = parseFloat(data.onOrders)
              return {
                asset,
                balance: available + pending,
                available,
                pending
              }
            })
          )
        })
        .catch(err => reject(err.message))
    })
  }

  assets() {
     return new Promise((resolve, reject) => {
      plnx.returnCurrencies()
        .then( currencies => {
          currencies = _.reduce(currencies, (result, data, sym) => (
            (!data.delisted && !data.disabled) ? result.concat([ sym ]) : result
          ), [] )
          resolve(currencies)
        })
        .catch(err => reject(err.message))
     })
  }

  pairs() {
    return new Promise((resolve, reject) => {
      plnx.returnTicker()
        .then( tickers => {
          let pairs = Object.keys(tickers)
          pairs = _.map(pairs, Pair.flip)
          resolve(pairs)
        })
        .catch(err => reject(err.message))
    })
  }

  depth(pair) {
    pair = Pair.flip(pair)
    return new Promise((resolve, reject) => {
      plnx.returnOrderBook(pair)
        .then( depth => {
          depth = { buy: depth.bids, sell: depth.asks }
          _.each(depth, (entries, type) => {
            depth[type] = _.map(entries, entry => _.map(entry, parseFloat))
          })
          resolve(depth)
        })
        .catch(err => reject(err.message))
    })
  }

}

module.exports = Poloniex

const privateMethods = {

  addOrder(type, pair, amount, rate) {
    pair = Pair.flip(pair)
    return new Promise((resolve, reject) => {
      plnx.sell(pair, rate, amount, false, false, false)
        .then( response => {
          let txid = response.orderNumber
          resolve({
            txid
          })
        })
        .catch(err => reject(err.message))
    })
  }

}
