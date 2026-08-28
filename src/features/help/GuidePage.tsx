import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

function Guide({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-lg border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <span className="font-medium">{title}</span>
        <span className="ml-2 text-sm text-gray-400">{summary}</span>
      </summary>
      <div className="border-t border-gray-100 px-4 py-3">{children}</div>
    </details>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed">{children}</ol>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{children}</p>
  );
}

const btn = 'rounded bg-gray-900 px-1.5 py-0.5 text-xs text-white';
const tab = 'rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700';

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="mb-4">
        <h1 className="text-lg font-medium">使用指南</h1>
        <p className="mt-1 text-sm text-gray-500">
          按最常做的事分好了，点开就是一步步的操作。第一次用建议先看前两条。
        </p>
      </div>

      <Guide
        title="录入一次入库"
        summary="工厂把货送到中国仓库"
        defaultOpen
      >
        <Steps>
          <li>
            顶部点 <span className={tab}>单据</span>，再点右上角 <span className={btn}>+ 新建单据</span>
          </li>
          <li>
            <b>单据名称</b> 填能认出来的，比如「8/18工厂交货」；<b>类型</b> 选「入库单」；<b>日期</b> 选实际到货那天
          </li>
          <li>
            下面是全部商品的表格。在搜索框输品名或品番找到商品，在最右边 <b>本批数量</b> 那一栏填数量。填了数量的行会变成黄色
          </li>
          <li>
            商品多的话别一个个填：点 <span className={tab}>下载CSV模板</span> → 用 Excel 打开 → 只在 <b>数量(QTY)</b> 那一列填数字，其他列别动，不发的商品留空 → 存盘 → 回来点 <span className={tab}>上传CSV</span>
          </li>
          <li>
            上传后数字会填进表格里，你还能再逐行核对修改。顶部一直显示「已选 N 个商品，合计 X」
          </li>
          <li>
            核对无误，点 <span className={btn}>提交这张单</span>
          </li>
          <li>
            提交后自动跳到这张单的详情页，能看到总数量、总箱数、总净重、总毛重、总CBM、总金额——报关和跟船公司对数用得上
          </li>
        </Steps>
        <Note>
          提交的瞬间，这些商品的实时库存就加上去了，不用再去别的地方改。其他人的屏幕上也会自动更新。
        </Note>
      </Guide>

      <Guide title="录入一次出库" summary="装柜发往日本">
        <Steps>
          <li>
            跟入库完全一样：<span className={tab}>单据</span> → <span className={btn}>+ 新建单据</span>
          </li>
          <li>
            <b>类型</b> 这里选「出库单」，名称建议写船期，比如「3/16商事海运」
          </li>
          <li>填数量或上传 CSV，方式跟入库一模一样</li>
          <li>
            点 <span className={btn}>提交这张单</span>，库存自动减掉
          </li>
        </Steps>
        <Note>
          如果某个商品出库数量超过现有库存，系统会弹窗提醒你数量是不是填错了——但不会拦着你。因为有时候确实是先发货、入库记录后补，这种情况点确认继续就行。
        </Note>
      </Guide>

      <Guide title="修改一个商品的资料" summary="改品番、单价、箱规、预警线">
        <Steps>
          <li>
            在 <span className={tab}>商品列表</span> 找到那个商品。左边分类栏点一下能缩小范围，或者直接用搜索框搜品番
          </li>
          <li>点这一行，进入商品详情页</li>
          <li>
            右上角点 <span className={tab}>编辑资料</span>
          </li>
          <li>改需要改的字段。品名是必填，其他都可以留空</li>
          <li>
            点 <span className={btn}>保存商品</span>，自动跳回详情页
          </li>
        </Steps>
        <Note>
          <b>编号改不了</b>——它是系统自动生成的，所有进出货记录都挂在这个编号上，改了历史就对不上了。你们要用自己的一套货号，填在 <b>品番</b> 那一栏，那个随便改。
        </Note>
      </Guide>

      <Guide title="新增一个商品" summary="进了以前没有的货">
        <Steps>
          <li>
            <span className={tab}>商品列表</span> → 右上角 <span className={btn}>+ 新增商品</span>
          </li>
          <li>
            <b>品名</b> 必填。同一类商品品名写成一样的，列表左边就会自动归到一个分类里
          </li>
          <li>品番、材质、箱规、尺寸、单价这些可以先空着，以后再补</li>
          <li>
            <b>期初库存</b> 填现在仓库里实际有多少。之后的加减由进出货记录自动算
          </li>
          <li>
            <b>预警线</b> 填一个数，库存低于它这一行会标红提醒
          </li>
          <li>
            点 <span className={btn}>保存商品</span>
          </li>
        </Steps>
      </Guide>

      <Guide title="临时记一笔" summary="零星进出，不值得开一张单">
        <Steps>
          <li>进入那个商品的详情页</li>
          <li>中间有个小表单，选「入库」「出库」或「订单」</li>
          <li>填数量、日期，备注可写可不写</li>
          <li>
            点 <span className={btn}>提交</span>，下面的历史流水立刻多一条
          </li>
        </Steps>
        <Note>
          也可以在 <span className={tab}>全部流水</span> 页面点「登记一笔」，那里能直接选任意商品。
        </Note>
      </Guide>

      <Guide title="查历史记录" summary="这批货什么时候发的、发了多少">
        <Steps>
          <li>
            <b>查一个商品的</b>：进商品详情页，下面就是它的完整时间线，出库红、入库绿、订单灰
          </li>
          <li>
            <b>查一整批的</b>：<span className={tab}>单据</span> 页面点进那张单，商品清单和各项汇总都在
          </li>
          <li>
            <b>混着查</b>：<span className={tab}>全部流水</span> 页面，所有记录按时间倒序。搜索框能搜品名、品番、单据名、备注——比如输「商事海运」就能调出那一整批
          </li>
          <li>还能按类型（入库/出库/订单）和日期区间筛选</li>
        </Steps>
      </Guide>

      <Guide title="订单怎么用" summary="下单了但还没到货">
        <Steps>
          <li>给工厂下了生产订单，就记一笔「订单」或建一张「订货单」</li>
          <li>
            商品列表的 <b>订单总数</b> 和 <b>订单（预计入库）</b> 两列会显示出来，方便看还有多少货在路上
          </li>
          <li>等货真的到了仓库，再单独记一笔「入库」</li>
        </Steps>
        <Note>
          <b>订单不影响库存数字</b>。实时库存只算入库减出库，因为订单的货还没进仓库。
        </Note>
      </Guide>

      <Guide title="导出 Excel" summary="做账、报关要用">
        <Steps>
          <li>
            <b>导库存</b>：<span className={tab}>商品列表</span> 右上角点「导出 Excel」，导出的是当前筛选出来的商品
          </li>
          <li>
            <b>导流水</b>：<span className={tab}>全部流水</span> 页面同样有导出按钮，先筛好日期区间和类型再导
          </li>
        </Steps>
      </Guide>

      <Guide title="几个人一起用会不会冲突" summary="跟以前传 Excel 的区别">
        <Steps>
          <li>不用了。大家打开的是同一个网页、同一份数据，没有"文件"这个概念，也就不会有版本错乱</li>
          <li>
            一个人录入后，其他人屏幕上的数字会<b>自动更新</b>，不用刷新
          </li>
          <li>两个人同时给一个商品记账也不会互相覆盖——每一笔都是新增一条记录，不是改同一个格子</li>
          <li>每条记录都自动记下是谁、什么时候录的</li>
        </Steps>
      </Guide>

      <p className="pt-2 text-sm text-gray-400">
        没找到想做的事，或者哪一步跟实际对不上，直接说，我改。
        <Link to="/" className="ml-2 underline">
          回商品列表
        </Link>
      </p>
    </div>
  );
}
