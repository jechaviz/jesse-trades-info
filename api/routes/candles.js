const { Router } = require('express')
const { Pool } = require('pg')
const { batchCandleJSON } = require('candlestick-convert')

const router = Router()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
})

router.get('/candles', function (req, res) {
  const {
    symbol,
    exchange,
    entryTimestamp,
    exitTimestamp
  } = req.query

  pool
    .query(`SELECT timestamp as time,open,high,low,close,volume
            FROM candle
            WHERE symbol='${symbol}'
            AND exchange='${exchange}'
            AND timestamp BETWEEN ${entryTimestamp} AND ${exitTimestamp}`)
    .then((result) => {
      const length = result.rows.length
      let newFrameMin = 1

      if (length > 10081 && length < 20160) {
        newFrameMin = 3
      }
      else if (length > 20161 && length < 40320) {
        newFrameMin = 5
      }
      else if (length > 40321 && length < 80640) {
        newFrameMin = 15
      }
      else if (length > 80641 && length < 161280) {
        newFrameMin = 30
      }
      else if (length > 161281 && length < 322560) {
        newFrameMin = 60
      }
      else if (length > 322561 && length < 645120) {
        newFrameMin = 120
      }
      else if (length > 645121) {
        newFrameMin = 180
      }

      console.log(length, newFrameMin, Math.round(length / newFrameMin))

      const candles = batchCandleJSON(result.rows, 60, newFrameMin * 60)

      res.json({
        data: candles
      })
    })
    .catch(err =>
      res.status(500).json(err.stack)
    )
})

module.exports = router
