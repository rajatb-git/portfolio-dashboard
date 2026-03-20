const regex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d[+-][0-2]\d:[0-5]\d)|(info)|\[(.*?)\]|: (.*) :|:(.*)/gi;

const text =
  '2024-06-12T17:13:44-05:00 INFO [symbol request COST]: https://www.finnhub.io/api/v1/quote?symbol=COST : {"response":"{"c":847.81,"d":-1.5,"dp":-0.1766,"h":855.74,"l":843.61,"o":850.08,"pc":849.31,"t":1718222401}"}';
