const MORSE = {
  a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',
  j:'.---',k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',
  s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','(':'-.--.',')'  :'-.--.-',' ':'/'
}
const MORSE_INV = Object.fromEntries(Object.entries(MORSE).map(([k,v]) => [v,k]))

function md5(str) {
  const buf = Buffer.from(str, 'utf8')
  let h0=0x67452301, h1=0xEFCDAB89, h2=0x98BADCFE, h3=0x10325476
  const K = Array.from({length:64},(_,i) => Math.floor(Math.abs(Math.sin(i+1))*2**32)>>>0)
  const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21]
  const bits = buf.length*8
  const pad  = Buffer.alloc(buf.length+1+(buf.length%64<56?55-buf.length%64:119-buf.length%64)+8)
  buf.copy(pad); pad[buf.length]=0x80
  pad.writeBigUInt64LE(BigInt(bits),pad.length-8)
  for (let o=0;o<pad.length;o+=64) {
    const M=Array.from({length:16},(_,i)=>pad.readUInt32LE(o+i*4))
    let [a,b,c,d]=[h0,h1,h2,h3]
    for (let i=0;i<64;i++) {
      let F,g
      if(i<16){F=(b&c)|(~b&d);g=i}
      else if(i<32){F=(d&b)|(~d&c);g=(5*i+1)%16}
      else if(i<48){F=b^c^d;g=(3*i+5)%16}
      else{F=c^(b|(~d>>>0));g=(7*i)%16}
      F=(F+a+K[i]+M[g])>>>0; a=d; d=c; c=b
      b=(b+((F<<s[i])|(F>>>(32-s[i]))))>>>0
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0
  }
  return [h0,h1,h2,h3].map(n=>n.toString(16).padStart(8,'0').match(/../g).reverse().join('')).join('')
}

const encriptadores = {
  base64:  s => Buffer.from(s).toString('base64'),
  hex:     s => Buffer.from(s).toString('hex'),
  rot13:   s => s.replace(/[a-zA-Z]/g, c => { const b=c<='Z'?65:97; return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b) }),
  url:     s => encodeURIComponent(s),
  binario: s => s.split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '),
  unicode: s => s.split('').map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join(''),
  md5:     s => md5(s),
  morse:   s => s.toLowerCase().split('').map(c=>MORSE[c]||'?').join(' '),
}

const esLegible = s => typeof s==='string' && s.length>0 && /^[\x20-\x7E\n\r\t]*$/.test(s)

function intentarDecodificar(text) {
  try { const v=Buffer.from(text,'base64').toString('utf-8'); if(esLegible(v)&&v!==text) return {tipo:'Base64',valor:v} } catch {}
  try { if(/^[0-9a-fA-F\s]+$/.test(text)&&text.replace(/\s/g,'').length%2===0){const v=Buffer.from(text.replace(/\s/g,''),'hex').toString('utf-8');if(esLegible(v))return{tipo:'Hex',valor:v}} } catch {}
  if(/^[01\s]+$/.test(text)&&text.trim().split(/\s+/).length>1) { try{const v=text.trim().split(/\s+/).map(b=>String.fromCharCode(parseInt(b,2))).join('');if(esLegible(v))return{tipo:'Binario',valor:v}}catch{} }
  try { const v=decodeURIComponent(text); if(v!==text&&esLegible(v))return{tipo:'URL',valor:v} } catch {}
  if(/\\u[\dA-F]{4}/i.test(text)){try{const v=text.replace(/\\u([\dA-F]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));if(esLegible(v))return{tipo:'Unicode',valor:v}}catch{}}
  if(/^[.\-/\s]+$/.test(text)){try{const v=text.trim().split(' / ').map(w=>w.split(' ').map(c=>MORSE_INV[c]||'?').join('')).join(' ');if(esLegible(v)&&!v.includes('?'))return{tipo:'Morse',valor:v}}catch{}}
  try{const v=text.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b)});if(v!==text&&esLegible(v))return{tipo:'ROT13',valor:v}}catch{}
  return null
}

const handler = async (m, { command, text }) => {
  const isEnc = ['encriptar','encrypt','criptografar'].includes(command)
  const isDec = ['desencriptar','decrypt','descriptografar'].includes(command)

  if (isEnc) {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *!encriptar <tipo>: <texto>*\n> Tipos: *base64 · hex · rot13 · url · binario · unicode · md5 · morse*`)
    const match = text.match(/^([a-zA-Z0-9]+)\s*[:>\-|=>]\s*(.+)$/s)
    if (!match) return m.reply(`*⌬┤ ✙ ├⌬ FORMATO INCORRECTO.*\n> Usá: *!encriptar base64: hola mundo*`)
    const tipo = match[1].trim().toLowerCase()
    const msg  = match[2].trim()
    const fn   = encriptadores[tipo]
    if (!fn) return m.reply(`*⌬┤ ✙ ├⌬ TIPO NO SOPORTADO.*\n> Tipos: base64, hex, rot13, url, binario, unicode, md5, morse`)
    try {
      await m.reply(`*⌬┤ 🔐 ├⌬ ENCRIPTADO · ${tipo.toUpperCase()}*\n\n≡ 📝 *Original:* \`${msg}\`\n≡ 🔒 *Resultado:* \`${fn(msg)}\``)
    } catch { m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`) }
    return
  }

  if (isDec) {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *!desencriptar <texto codificado>*\n> Detecta automáticamente: base64, hex, binario, url, unicode, rot13, morse`)
    try {
      const res = intentarDecodificar(text)
      if (!res) return m.reply(`*⌬┤ ❌ ├⌬ NO DETECTADO.*\n> No se pudo identificar el formato del texto.`)
      await m.reply(`*⌬┤ 🔓 ├⌬ DESENCRIPTADO · ${res.tipo}*\n\n≡ 🔒 *Original:* \`${text.slice(0,80)}\`\n≡ 📝 *Resultado:* \`${res.valor}\``)
    } catch { m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`) }
  }
}

handler.help = ['encriptar <tipo>: <texto>', 'desencriptar <texto>']
handler.command = ['encriptar','encrypt','criptografar','desencriptar','decrypt','descriptografar']
handler.tags = ['convertidores']

export default handler