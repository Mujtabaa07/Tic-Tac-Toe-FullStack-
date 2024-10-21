module.exports = {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'https://tic-tac-toe-fullstack-1.onrender.com/api/:path*', // Proxy to Backend
        },
      ];
    },
  };
  