const { audit, field, integer, requireValue, token, transaction } = require('./foundation.cjs');
const { adjust } = require('./commerce.cjs');

function createCase(db, user, input) {
  const { kind } = input;
  requireValue(['cancel','return','warranty','support','privacy'].includes(kind),'Tipo de solicitud inválido.');
  const needsOrder = ['cancel','return','warranty'].includes(kind);
  const id = input.orderId || needsOrder ? integer(input.orderId,'pedido',1,1e9) : null;
  const item = input.productId ? integer(input.productId,'partida',1,1e9) : null;
  const reason=field(input.reason,'motivo',5,450);
  const evidence=input.evidence ? field(input.evidence,'evidencia',1,450) : '';
  return transaction(db,()=>{
    if(id){
      const order=db.prepare('SELECT status FROM orders WHERE id=? AND user_id=?').get(id,user.id);
      requireValue(order,'Pedido no encontrado.',404);
      if(needsOrder) requireValue(!['cancelled','refunded'].includes(order.status),'El pedido fue cerrado.',409);
      if (['return','warranty'].includes(kind)) requireValue(order.status!=='pending','El pedido no tiene un pago aprobado.',409);
      if(item) requireValue(db.prepare('SELECT 1 FROM order_items WHERE order_id=? AND product_id=?').get(id,item),'Partida incorrecta.',400);
      if(needsOrder) requireValue(!db.prepare("SELECT id FROM cases WHERE order_id=? AND kind IN ('cancel','return','warranty') AND status IN ('open','needs_info')").get(id),'Ya hay una solicitud comercial abierta para este pedido.',409);
    }
    const folio='AT-'+token().slice(0,12).toUpperCase();
    const result=db.prepare('INSERT INTO cases(folio,user_id,order_id,product_id,kind,reason,evidence) VALUES(?,?,?,?,?,?,?)').run(folio,user.id,id,item,kind,reason,evidence);
    const caseId=Number(result.lastInsertRowid);
    audit(db,user.id,'case_opened','case',caseId,kind);
    return {id:caseId,folio,status:'open'};
  });
}
function caseList(db,user) {
  const rows=user.role==='admin'
    ? db.prepare('SELECT * FROM cases ORDER BY id DESC LIMIT 250').all()
    : db.prepare('SELECT * FROM cases WHERE user_id=? ORDER BY id DESC LIMIT 250').all(user.id);
  return rows.map(row=>({...row,messages:db.prepare('SELECT actor_id,body,created_at FROM case_messages WHERE case_id=? ORDER BY id').all(row.id)}));
}
function addCaseMessage(db,user,id,input) {
  const message=field(input.message,'aclaración',2,700);
  return transaction(db,()=>{
    const row=db.prepare('SELECT * FROM cases WHERE id=?').get(id);
    requireValue(row && (user.role==='admin'||row.user_id===user.id),'Solicitud no encontrada.',404);
    requireValue(['open','needs_info'].includes(row.status),'Solicitud cerrada.',409);
    db.prepare('INSERT INTO case_messages(case_id,actor_id,body) VALUES(?,?,?)').run(id,user.id,message);
    if(user.role==='client' && row.status==='needs_info') db.prepare("UPDATE cases SET status='open' WHERE id=?").run(id);
    audit(db,user.id,'case_message','case',id);
    return {ok:true};
  });
}
function resolveCase(db,user,id,input) {
  requireValue(['needs_info','approved','denied'].includes(input.status),'Resultado inválido.');
  const resolution=field(input.resolution,'resolución',5,700);
  const action=input.status==='approved' ? input.action||'none' : 'none';
  requireValue(['refund','replacement','none'].includes(action),'Acción inválida.');
  return transaction(db,()=>{
    const row=db.prepare('SELECT * FROM cases WHERE id=?').get(id);
    requireValue(row,'Solicitud no encontrada.',404);
    requireValue(['open','needs_info'].includes(row.status),'Solicitud cerrada.',409);
    if(action!=='none') requireValue(row.order_id && ['cancel','return','warranty'].includes(row.kind),'Acción solo para solicitudes comerciales.');
    if(action==='refund'){
      const order=db.prepare('SELECT status FROM orders WHERE id=?').get(row.order_id);
      requireValue(order&&!['cancelled','refunded'].includes(order.status),'El pedido ya se cerró.',409);
      const refunded=order.status!=='pending';
      const status=refunded?'refunded':'cancelled';
      if(refunded){
        for(const item of db.prepare('SELECT * FROM order_items WHERE order_id=?').all(row.order_id)){
          adjust(db,item.product_id,item.quantity,'refund',user.id,row.order_id);
        }
      }
      db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,row.order_id);
      db.prepare('UPDATE payments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?').run(refunded?'refunded':'declined',row.order_id);
      db.prepare("UPDATE shipments SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(row.order_id);
      audit(db,user.id,'order_closed','order',row.order_id,status);
    }
    if(action==='replacement'){
      const shipment=db.prepare("SELECT status FROM shipments WHERE order_id=? AND status IN ('sent','delivered')").get(row.order_id);
      requireValue(shipment,'Solo se repone una entrega liberada.',409);
      const reference='DIG-R-'+token().slice(0,12).toUpperCase();
      db.prepare("UPDATE shipments SET status='delivered',tracking=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(reference,row.order_id);
      db.prepare("UPDATE orders SET status='delivered' WHERE id=?").run(row.order_id);
      audit(db,user.id,'replacement','order',row.order_id,'Reposición digital generada');
    }
    db.prepare(`UPDATE cases SET status=?,resolution=?,action=?,actor_id=?,
      resolved_at=CASE WHEN ? IN ('approved','denied') THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?`)
      .run(input.status,resolution,action,user.id,input.status,id);
    audit(db,user.id,'case_resolution','case',id,input.status+':'+action);
    return {id,status:input.status};
  });
}
module.exports={createCase,caseList,addCaseMessage,resolveCase};
