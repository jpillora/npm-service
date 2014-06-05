node -e "require('./').server(process.env.PORT).on('listening', console.log.bind(console,'listening...'));"
