const test=require('node:test');
const assert=require('node:assert/strict');

global.window={};
require('../admin/admin-party-ledgers.js');

const {buildEntries,summarizeParty}=window.YKPartyLedgerModel;

function fixture(){
  const customer={id:'customer-1',name:'Ashok',business_name:'YK Buyer'};
  const supplier={id:'supplier-1',name:'Lotus'};
  return{
    customer,
    supplier,
    state:{
      customers:[customer],
      suppliers:[supplier],
      orders:[{id:'order-1',customer_id:customer.id,order_number:'SO-1',status:'delivered',grand_total:1000,amount_paid:400,balance_due:600,payment_due_date:'2020-01-20',created_at:'2020-01-10T08:00:00Z'}],
      purchaseOrders:[{id:'po-1',supplier_id:supplier.id,po_number:'PO-1',status:'received',grand_total:2000,amount_paid:500,balance_due:1500,order_date:'2020-01-12',expected_delivery:'2020-01-18',created_at:'2020-01-12T08:00:00Z'}],
      openings:[
        {id:'opening-customer',counterparty_type:'customer',customer_id:customer.id,original_amount:500,settled_amount:200,balance_due:300,as_of_date:'2020-01-01',due_date:'2020-01-05'},
        {id:'opening-supplier',counterparty_type:'supplier',supplier_id:supplier.id,original_amount:1000,settled_amount:200,balance_due:800,as_of_date:'2020-01-01',due_date:'2020-01-05'}
      ],
      transactions:[
        {id:'tx-1',opening_balance_id:'opening-customer',account_id:'cash',amount:50,transaction_number:'RC-1',transaction_date:'2020-01-03'},
        {id:'tx-2',order_id:'order-1',account_id:'cash',amount:250,transaction_number:'RC-2',transaction_date:'2020-01-15'},
        {id:'tx-3',opening_balance_id:'opening-supplier',account_id:'bank',amount:200,transaction_number:'PV-1',transaction_date:'2020-01-04'},
        {id:'tx-4',purchase_order_id:'po-1',account_id:'bank',amount:500,transaction_number:'PV-2',transaction_date:'2020-01-16'}
      ],
      accounts:[{id:'cash',name:'Cash Counter'},{id:'bank',name:'Bank'}]
    }
  };
}

test('customer ledger reconciles imported and cashbook payments to the canonical due balance',()=>{
  const {state,customer}=fixture();
  const entries=buildEntries(state,'customer',customer);
  assert.equal(entries.at(-1).balance,900);
  assert.equal(entries.reduce((sum,row)=>sum+row.increase-row.decrease,0),900);
  assert.equal(summarizeParty(state,'customer',customer).due,900);
});

test('supplier ledger combines opening payable and purchase-order payable',()=>{
  const {state,supplier}=fixture();
  const entries=buildEntries(state,'supplier',supplier);
  const summary=summarizeParty(state,'supplier',supplier);
  assert.equal(entries.at(-1).balance,2300);
  assert.equal(summary.openingDue,800);
  assert.equal(summary.tradingDue,1500);
  assert.equal(summary.due,2300);
  assert.equal(summary.overdue,800);
});

test('cancelled sales and purchases never affect party balances',()=>{
  const {state,customer,supplier}=fixture();
  state.orders.push({id:'cancelled-sale',customer_id:customer.id,status:'cancelled',grand_total:9999,balance_due:9999,created_at:'2020-02-01'});
  state.purchaseOrders.push({id:'cancelled-po',supplier_id:supplier.id,status:'cancelled',grand_total:9999,balance_due:9999,order_date:'2020-02-01'});
  assert.equal(summarizeParty(state,'customer',customer).due,900);
  assert.equal(summarizeParty(state,'supplier',supplier).due,2300);
});
