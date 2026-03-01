console.log(`${new Date()}的链家徐汇滨江的数据`)
// let url='https://sh.lianjia.com/ershoufang/xuhuibinjiang/ie2/';
const https=require('https');
const selectSort=require('./selectSort.config.js')
const cheerio=require('cheerio')
const fs=require('fs')
const getResult=(obj,reslutNum,pg)=>{
    let attr=Object.keys(obj)
    let res=``;
    for(let i=0;i<attr.length;i++){
        if(attr[i]==='houseInfo'&&selectSort.info){
            let infoList=obj[attr[i]][reslutNum].split('|');
            res+=`${infoList[1]},${infoList[4]},${infoList[5]}`

        }else{
            res+=`${obj[attr[i]][reslutNum]},`
        }
    }
    return res+`所在页数${pg}\r\n`;
}
let pg=1;
const getUrl=(pg)=>{
    return `https://sh.lianjia.com/ershoufang/xuhui/${!selectSort.all?`pg${pg}f2f5l2l3ba80ea200bp0ep600`:`${pg===1?'':'pg'+pg}`}/`
}
//总数
let total=0;

//需要页数
let needPgNumber=0;
//结果
const result=[];
const getEach=(p,callback)=>{
    https.get(getUrl(p),(res)=>{
        //每页数
        let length=0;
        console.log('开始请求'+p+'页！')
        let buffers=[],
        size=0;
        res.on('data',(buffer)=>{
            buffers.push(buffer)
            size+=buffer.length;
        });
        res.on('end',()=>{
            let data=Buffer.concat(buffers,size);
            const html=data.toString()
            let $=cheerio.load(html);
            //筛选总共
            if(p===1){
                total=parseInt($('.total span')[0].children[0].data)
            }
            //房屋属性(查询条件)
            let houseAttr={
                //地段
                position:$(".positionInfo a:last-child"),
                //总价
                totalPrice:$(".totalPrice span"),
                //单价
                unit:$('.unitPrice span'),
                //房屋信息    面积
                houseInfo:$('.houseInfo')
            }
            const transObj={}
            
            Object.keys(houseAttr).forEach(attr=>{
                transObj[attr]=[];
                Array.prototype.forEach.call(houseAttr[attr],item=>{
                    transObj[attr].push(item.children[0].data?item.children[0].data:item.children[1].data);
                    if(attr==='totalPrice'){length+=1;};
                })
            })
            
            for(let i=0;i<length;i++){
                result.push(getResult(transObj,i,pg))
            }
            callback(result,total)
        })
        
    })
}    
const continueGet=(result,total)=>{
    if(result.length===total||result>total){
        const date=new Date();
        const time=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
        console.log(result,result.length)
        result.unshift(`${time}:一共${total}套\r\n`)
        console.log(`数据采集完成,共${total}套`);
        console.log(selectSort.info)
        let name=`房子${!selectSort.info?'含信息':''}-${time}`
        if(selectSort.price){
            result.sort((a,b)=>a.split(',')[1]-b.split(',')[1])
            name=`总价排序-`+name
        }
        if(selectSort.all){
            name='all-'+time
        }
        fs.writeFile(`./`+name+'.txt',result.join(''),'utf8',function(err){
            //如果err=null，表示文件使用成功，否则，表示文件失败
            if(err)
                console.log('写文件出错了，错误是：'+err);
            else
                console.log('ok');
        }) 
        return ;
    }else{
        pg+=1;
        return getEach(pg,continueGet)
    }
}
getEach(pg,continueGet)
