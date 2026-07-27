export function urlStagingAPI(countryCode: string = "ID"): string {
  if (countryCode.toUpperCase() === "TH") {
    return "https://gurkha-staging.accesstrade.in.th";
  } else if (countryCode.toUpperCase() === "VN") {
    return "https://gurkha-staging.accesstrade.vn";
  }
  return `https://gurkha-staging.accesstrade.co.id`;
}
