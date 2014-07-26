var test = require('./helpers')
var concat = require('concat-stream')

test('read changes feed', function(t, db) {
  db.put('hello', 'world', function() {
    db.put('hej', 'verden', function() {
      db.createChangesReadStream().pipe(concat(function(changes) {
        t.same(changes.length, 2, '2 changes')
        t.same(changes[0], {key:'hello', change:1, version:1, type:'create'})
        t.same(changes[1], {key:'hej', change:2, version:1, type:'create'})
        t.end()
      }))
    })
  })
})

test('read changes feed + data', function(t, db) {
  db.put('hello', 'world', function() {
    db.put('hej', 'verden', function() {
      db.createChangesReadStream({data:true}).pipe(concat(function(changes) {
        t.same(changes.length, 2, '2 changes')
        t.same(changes[0], {key:'hello', change:1, version:1, type:'create', value:'world'})
        t.same(changes[1], {key:'hej', change:2, version:1, type:'create', value:'verden'})
        t.end()
      }))
    })
  })
})

test('read changes feed + update', function(t, db) {
  db.put('hello', 'world', function() {
    db.put('hello', 'world', {version:1}, function() {
      db.del('hello', function() {
        db.createChangesReadStream().pipe(concat(function(changes) {
          t.same(changes.length, 3, '3 changes')
          t.same(changes[0], {key:'hello', change:1, version:1, type:'create'})
          t.same(changes[1], {key:'hello', change:2, version:2, type:'update'})
          t.same(changes[2], {key:'hello', change:3, version:2, type:'delete'})
          t.end()
        }))
      })
    })
  })
})

test('read changes feed + update + since option', function(t, db) {
  db.put('hello', 'world', function() {
    db.put('hello', 'world', {version:1}, function() {
      db.del('hello', function() {
        db.createChangesReadStream({since:1}).pipe(concat(function(changes) {
          t.same(changes.length, 2, '2 changes')
          t.same(changes[0], {key:'hello', change:2, version:2, type:'update'})
          t.same(changes[1], {key:'hello', change:3, version:2, type:'delete'})
          t.end()
        }))
      })
    })
  })
})


test('write changed feed', function(t, db) {
  var changes = db.createChangesWriteStream()

  changes.write({key:'hello', change:1, version:1, type:'create', value:'world'})
  changes.write({key:'hej', change:2, version:1, type:'create', value:'verden'})

  changes.end(function() {
    db.createReadStream().pipe(concat(function(rows) {
      t.same(rows.length, 2, '2 rows')
      t.same(rows[0], {key:'hej', version:1, value:'verden'})
      t.same(rows[1], {key:'hello', version:1, value:'world'})
      t.end()
    }))
  })
})

test('write changed feed + updates', function(t, db) {
  var changes = db.createChangesWriteStream()

  changes.write({key:'hello', change:1, version:1, type:'create', value:'world'})
  changes.write({key:'hello', change:2, version:2, type:'create', value:'verden'})

  changes.end(function() {
    db.createReadStream().pipe(concat(function(rows) {
      t.same(rows.length, 1, '1 row')
      t.same(rows[0], {key:'hello', version:2, value:'verden'})
      t.end()
    }))
  })
})

test('write changed feed + delete', function(t, db) {
  var changes = db.createChangesWriteStream()

  changes.write({key:'hello', change:1, version:1, type:'create', value:'world'})
  changes.write({key:'hello', change:2, version:2, type:'create', value:'verden'})
  changes.write({key:'hello', change:3, version:2, type:'delete'})

  changes.end(function() {
    db.createReadStream().pipe(concat(function(rows) {
      t.same(rows.length, 0, '0 rows')
      t.end()
    }))
  })
})

test('pipe changes feeds', function(t, db1, db2) {
  db1.put('hello', 'world', function() {
    db1.put('hello', 'verden', {version:1}, function() {
      db1.put('hej', 'verden', function() {
        db1.createChangesReadStream({data:true})
          .pipe(db2.createChangesWriteStream())
          .on('finish', function() {
            db2.createReadStream().pipe(concat(function(rows) {
              t.same(rows.length, 2, '2 rows')
              t.same(rows[0], {key:'hej', value:'verden', version:1})
              t.same(rows[1], {key:'hello', value:'verden', version:2})
              t.end()
            }))
          })
      })
    })
  })
})

test('feeds are equal after pipe', function(t, db1, db2) {
  db1.put('hello', 'world', function() {
    db1.put('hello', 'verden', {version:1}, function() {
      db1.put('hej', 'verden', function() {
        db1.createChangesReadStream({data:true})
          .pipe(db2.createChangesWriteStream())
          .on('finish', function() {
            db1.createChangesReadStream().pipe(concat(function(changes1) {
              db2.createChangesReadStream().pipe(concat(function(changes2) {
                t.same(changes1, changes2, 'changes equal')
                t.end()
              }))
            }))
          })
      })
    })
  })
})