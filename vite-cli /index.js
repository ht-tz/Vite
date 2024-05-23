#! /usr/bin/env node

const Koa = require('koa');
const send = require('koa-send');
const path  = require('path')
const compilerSFC = require('@vue/compiler-sfc')
const {Readable} = require('stream')

const streamingTOString = stram => {
    const chunks = []
    return new Promise((resolve, reject) => {
        stram.on('data', chunk => chunks.push(chunk))
        //文件合并在转换为字符串
        stram.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        stram.on('error', reject)
    })
}

// 字符串转换为流
const stringTOStream = text => {
    const steam = new Readable()
    steam.push(text)
    steam.push(null)
    return steam
}

//koa koa实例
 
const app = new Koa()

// 加载第三方模块

app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/@modules/')) {
        //
        const moduleName = ctx.path.replace('/@modules/', '')
        //process.cwd()当前项目的路径
        const pakPath = path.join(process.cwd(), 'node_modules', moduleName, 'packkage.json')
        const pkg = require(pakPath)
        //  从新给ctx 赋值，因为之前请求的路径不存在， 所需要请求node_module文件下
        ctx.path = path.join("/node_modules", moduleName, pkg.module)
    }
   await next()

})



// 静态文件服务器
 app.use(async (ctx) => {
     await send(ctx, ctx.path, { root: process.cwd(), '/index.html' });
    await next()
 })

//修改第三方模块的路径
 app.use(async (ctx, next) => {
     if (ctx.type === "application/javascript") {
         const contents = await streamingTOString(ctx.body)
         ctx.body = contents.replace(/(from\s+['"])(?![\.\/])/g, "$1/@modules/")
         .replace(/process\.env\.NODE_ENV/g, '"development"')
         }
     })

//处理单个文件
    app.use(async (ctx, next) => {
        if (ctx.path.endsWith('.vue')) {
            //ctx. body是一个流 
            const contents = await streamingTOString(ctx.body)
            const { descriptor } = compilerSFC.parse(contents)
            let computed 
            i(!ctx.query.type) {
                // 不存在的话是第一次请求
                code = descriptor.script.content
                code = code.replace(/export\s+default\s+/g, 'const __script =')
                code += `
                
                import { render as __render } from  "${ctx.path}?type=template"
                __script.render = __render
                export default __script
                `
            } else if (ctx.query.type === 'template') {
                //单文件的爹万人次请求
               const templateRender =  compilerSFC.compileTemplate({
                    source: descriptor.template.content,
                    filename: ctx.path
               })
                code = templateRender.code
            }
            // 告诉浏览器执行的是的js
            ctx.type = "application/javascript"
            ctx.body = stringTOStream(code)
        }
        await next()

    }
) 
app.listen(3000, () => {
    console.log('server is running at http://localhost:3000')
})
