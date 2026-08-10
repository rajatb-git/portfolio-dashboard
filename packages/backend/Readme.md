# Portfolio Dashboard Backend

[Documentation](https://rajatb-git.github.io/portfolio-dashboard-db/)

## Project Overview

This repository contains the backend code for [portfolio dashboard](https://github.com/rajatb-git/portfolio-dashboard). The application allows user to track their investment holdings accross multiple accounts, view live market data, and receive personalized recommendations.

## Features

- **Holdings Tracking:** Users can log their stock and cryptocurrency holdings, including purchase date, quantity, and price.
- **Live Quotes:** The application fetches real-time price quotes for stocks and cryptocurrencies from external APIs.
- **Personalized Recommendations:** The backend provides investment recommendations based on account holdings and market trends.
- **Dashboard:** A comprehensive dashboard displays an overview of account investments, including performance metrics and visualizations.
- **Transactions:** Users can view a history of their transactions, including buys, sells, and deposits.
- **IPOs:** The application provides information on upcoming initial public offerings (IPOs).

## Technical Details

### Technologies Used

- **Node.js:** JavaScript runtime environment
- **Koa:** Web framework for Node.js
- **MongoDB:** Centralized database for data persistence
- **Axios:** Promise-based HTTP client for making API requests
- **Winston:** Logging library
- **FinnHub:** External API for stock and cryptocurrency data
- **NASDAQ:** External API for historical price data

### Architecture

The backend follows a Model-View-Controller (MVC) architecture.

- **Models:** Define the data structures for holdings, quotes, recommendations, transactions, and accounts.
- **Controllers:** Handle business logic and data manipulation.
- **Routers:** Define API endpoints and map them to controller actions.

### External APIs

The application relies on external APIs to provide live market data and recommendations.

- **FinnHub:** Provides real-time quotes, recommendations, news, and IPO information.
- **NASDAQ:** Provides historical price data for charting.

### Database

MongoDB is used to store accounts data and application state. Configure `MONGO_URI`/`MONGO_DB_NAME` in `.env` (see `.env.example`) to point at your own MongoDB server.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Environment variables configured (see `.env.example`)

### Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run do` to build and start the application

### API Documentation

The API documentation is available at [link to API documentation].

## Contributing

Contributions are welcome! Please submit a pull request with your proposed changes.

## License

This project is licensed under the MIT License.

## Contact

For any questions or feedback, please start a discussion.
