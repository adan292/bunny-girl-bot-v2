import chalk from 'chalk'

let _jsonMode = false

export function isJsonMode() {
  return _jsonMode
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  
  if (!uri) {
    _jsonMode = true
    console.log(
      chalk.bold.bgYellow.black(' [DB] '),
      chalk.bold.yellowBright('Sin MONGODB_URI — usando almacenamiento JSON local.'),
      chalk.gray('(lib/database/data/)')
    )
    return false
  }

  
  try {
    const mongoose = (await import('mongoose')).default

    mongoose.set('strictQuery', false)
    console.log(chalk.bold.cyanBright('\n⏳ Conectando a la base de datos...'))

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })

    console.log(
      chalk.bold.bgGreen.white(' [DB SUCCESS] '),
      chalk.bold.greenBright('¡Conectado a MongoDB exitosamente!\n')
    )

    mongoose.connection.on('disconnected', () =>
      console.log(chalk.bold.bgRed.white(' [DB DISCONNECT] '), chalk.bold.redBright('Se perdió la conexión con MongoDB.'))
    )
    mongoose.connection.on('reconnected', () =>
      console.log(chalk.bold.bgGreen.white(' [DB RECONNECT] '), chalk.bold.greenBright('Se recuperó la conexión con MongoDB.'))
    )

    return true

  } catch (error) {
    
    _jsonMode = true
    console.warn(
      chalk.bold.bgYellow.black(' [DB FALLBACK] '),
      chalk.bold.yellowBright('No se pudo conectar a MongoDB. Usando JSON como respaldo.')
    )
    console.warn(chalk.gray('  →', error.message))
    return false
  }
}
