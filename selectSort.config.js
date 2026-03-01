const confirmENV=(e)=>{
    // console.log(e,process.env[e],typeof process.env[e])
    return process.env[e]&&process.env[e].trim();//fix the set more space bug
}
module.exports={
    //总价排序
    price:1,
    //房屋信息是否拆分
    info:confirmENV('info')==='0'?0:1,
    //全部
    all:process.env.all==='0'?0:1
}

console.log(process.env.all,process.env.info,typeof process.env.info,Object.prototype.toString.call(process.env.info))