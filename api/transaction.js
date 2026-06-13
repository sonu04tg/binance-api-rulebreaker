export default async function handler(req, res) {
  const { api_key, api_secret, txn_id } = req.query;

  const DEVELOPER = "@Rule_Breakerz";

  if (!api_key || !api_secret || !txn_id) {
    return res.status(400).json({
      success: false,
      message: "Missing api_key, api_secret or txn_id",
      developer: DEVELOPER
    });
  }

  try {
    // Binance server time
    const timeRes = await fetch(
      "https://api.binance.com/api/v3/time"
    );

    const timeData = await timeRes.json();
    const timestamp = timeData.serverTime;

    return res.status(200).json({
      success: true,
      message: "Binance connection successful",
      developer: DEVELOPER,
      txn_id,
      binance_time: timestamp
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to connect Binance",
      developer: DEVELOPER,
      error: error?.message || String(error)
    });
  }
}
