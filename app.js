/* ==========================================================
   BookLib - JavaScript Library
   Small, reusable modules with no dependencies:
     BookLib.Validator  - rule-based form validation
     BookLib.Store      - saves and loads loans (localStorage)
     BookLib.Loans      - loan logic (overdue check, counts)
     BookLib.View       - renders the table and summary
     BookLib.createTracker(selectors) - wires everything up
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- Validator ---------- */
  var Validator = {
    rules: {
      required: function (value) { return String(value).trim() !== ''; }
    },

    // fields: [{ name, rules: ['required'], messages: { required: '...' } }]
    validate: function (form, fields) {
      var errors = {};
      fields.forEach(function (field) {
        var value = form.elements[field.name].value;
        for (var i = 0; i < field.rules.length; i++) {
          var rule = field.rules[i];
          if (!Validator.rules[rule](value)) {
            errors[field.name] = field.messages[rule];
            break;
          }
        }
      });
      return errors;
    },

    show: function (form, fields, errors) {
      fields.forEach(function (field) {
        var input = form.elements[field.name];
        var box = form.querySelector('#' + field.name + '-error');
        var message = errors[field.name] || '';
        box.textContent = message;
        input.classList.toggle('ui-input-invalid', message !== '');
        input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
      });
    }
  };

  /* ---------- Store ---------- */
  var Store = {
    key: 'book-lending-tracker',
    load: function () {
      try { return JSON.parse(global.localStorage.getItem(Store.key)) || []; }
      catch (e) { return []; }
    },
    save: function (loans) {
      try { global.localStorage.setItem(Store.key, JSON.stringify(loans)); }
      catch (e) { /* storage unavailable: keep working in memory */ }
    }
  };

  /* ---------- Loans ---------- */
  var Loans = {
    today: function () {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + m + '-' + day;
    },
    isOverdue: function (loan) { return loan.dueDate < Loans.today(); },
    countOverdue: function (loans) { return loans.filter(Loans.isOverdue).length; }
  };

  /* ---------- View ---------- */
  var View = {
    cell: function (row, text) {
      var td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
      return td;
    },

    render: function (els, loans, onReturn) {
      els.rows.innerHTML = '';
      loans.forEach(function (loan) {
        var row = document.createElement('tr');
        View.cell(row, loan.title);
        View.cell(row, loan.author);
        View.cell(row, loan.borrower);
        View.cell(row, loan.dueDate);
        View.cell(row, loan.genre);

        var overdue = Loans.isOverdue(loan);
        var statusCell = document.createElement('td');
        var badge = document.createElement('span');
        badge.className = 'ui-badge ' + (overdue ? 'ui-badge-danger' : 'ui-badge-ok');
        badge.textContent = overdue ? 'Overdue' : 'On loan';
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        var actionCell = document.createElement('td');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ui-btn ui-btn-secondary';
        btn.textContent = 'Mark returned';
        btn.addEventListener('click', function () { onReturn(loan.id); });
        actionCell.appendChild(btn);
        row.appendChild(actionCell);

        els.rows.appendChild(row);
      });

      els.total.textContent = loans.length;
      els.overdue.textContent = Loans.countOverdue(loans);
      els.empty.classList.toggle('ui-hidden', loans.length > 0);
    }
  };

  /* ---------- Tracker (wires the modules together) ---------- */
  var fields = [
    { name: 'title', rules: ['required'], messages: { required: 'Enter the book title.' } },
    { name: 'author', rules: ['required'], messages: { required: 'Enter the author name.' } },
    { name: 'borrower', rules: ['required'], messages: { required: 'Enter who is borrowing the book.' } },
    { name: 'dueDate', rules: ['required'], messages: { required: 'Choose a due date.' } },
    { name: 'genre', rules: ['required'], messages: { required: 'Choose a genre.' } }
 
];

  function createTracker(selectors) {
    var form = document.querySelector(selectors.form);
    var els = {
      rows: document.querySelector(selectors.rows),
      empty: document.querySelector(selectors.empty),
      total: document.querySelector(selectors.total),
      overdue: document.querySelector(selectors.overdue)
    };
    var loans = Store.load();

    function refresh() { View.render(els, loans, returnLoan); }

    function returnLoan(id) {
      loans = loans.filter(function (loan) { return loan.id !== id; });
      Store.save(loans);
      refresh();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var errors = Validator.validate(form, fields);
      Validator.show(form, fields, errors);
      if (Object.keys(errors).length > 0) return;

      loans.push({
        id: Date.now(),
        title: form.elements.title.value.trim(),
        author: form.elements.author.value.trim(),
        borrower: form.elements.borrower.value.trim(),
        dueDate: form.elements.dueDate.value,
        genre: form.elements.genre.value
      });
      Store.save(loans);
      form.reset();
      refresh();
    });

    refresh();
  }

  global.BookLib = { Validator: Validator, Store: Store, Loans: Loans, View: View, createTracker: createTracker };
})(window);