const axios = require("axios");
const crypto = require("crypto");

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

async function getServerTime() {
  try {
    const { data } = await axios.get(
      "https://api.binance.com/api/v3/time"
    );
    return data.serverTime;
  } catch {
    return Date.now();
  }
}

async function getDepositByTxHash(txHash, serverTime) {
  const recvWindow = 60000;

  const query =
    `txId=${txHash}&timestamp=${serverTime}&recvWindow=${recvWindow}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(query)
    .digest("hex");

  const url =
    `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;

  const { data } = await axios.get(url, {
    headers: {
      "X-MBX-APIKEY": API_KEY
    }
  });

  return Array.isArray(data) ? data[0] : null;
}

async function getPayTransaction(startTime, serverTime, id) {
  const recvWindow = 60000;

  const query =
    `timestamp=${serverTime}&recvWindow=${recvWindow}&startTime=${startTime}&endTime=${serverTime}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(query)
    .digest("hex");

  const url =
    `https://api.binance.com/sapi/v1/pay/transactions?${query}&signature=${signature}`;

  const { data } = await axios.get(url, {
    headers: {
      "X-MBX-APIKEY": API_KEY
    }
  });

  return (
    data?.data?.find(
      (tx) => String(tx.orderId) === String(id)
    ) || null
  );
}

module.exports = async (req, res) => {
  const { id, startTime } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Missing id"
    });
  }

  const isTxHash = /^[a-zA-Z0-9]{40,}$/.test(id);

  try {
    const serverTime = await getServerTime();

    const finalStartTime = startTime
      ? Number(startTime)
      : serverTime - DEFAULT_WINDOW_MS;

    let transaction;

    if (isTxHash) {
      transaction = await getDepositByTxHash(
        id,
        serverTime
      );
    } else {
      transaction = await getPayTransaction(
        finalStartTime,
        serverTime,
        id
      );
    }

    if (!transaction) {
      return res.json({
        success: false,
        message: "Transaction not found"
      });
    }

    return res.json({
      success: true,
      transaction
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch transaction",
      error: e.message
    });
  }
};
