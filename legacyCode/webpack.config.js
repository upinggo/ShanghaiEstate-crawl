// const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path')
const webpack = require('webpack');
module.exports = {
    output:{
        path: path.resolve(__dirname, "dist"), 
    }
    // plugins: [
        // new CopyWebpackPlugin([
        //     {
        //         from: 'public/js/*.js',
        //         to: path.resolve(__dirname, 'dist', 'txt'),
        //     },
        //     //还可以继续配置其它要拷贝的文件
        // ])
    // ]
}