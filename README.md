## Uniswap v3 流动性报告工具
一个基于cloudflare 的 worker平台, 实现定时统计流动性挖矿手续费收益, 并且推送到移动设备的小工具


## 如何使用
```
基于 wrangler.toml.template, 替换里面的配置. 如下
account_id cloudflare worker的 accountID
INFURA_RPC "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" 可选则自己的,也可以用这个公共的
PUSHDEER_KEY 使用 http://pushdeer.com/ 做的推送 
TOKEN_LIST = "[xxx,xxx]" 流动性挖矿的TokenID
创建成 wrangler.toml 文件

然后 wrangler publish 即可
```