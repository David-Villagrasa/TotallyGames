import sys
import csv
import re
from PyQt5 import QtWidgets, QtCore, QtGui
from table_window import Ui_Dialog

class TableWindow(QtWidgets.QDialog, Ui_Dialog):
    def __init__(self, parent=None, file_path=""):
        super(TableWindow, self).__init__(parent)
        self.setupUi(self)
        self.file_path = file_path
        self.initial_values = {}
        self.load_data()
        self.addButton.clicked.connect(self.add_row)
        self.saveButton.clicked.connect(self.save_data)
        self.refreshButton.clicked.connect(self.load_data)
        self.deleteRowButton.clicked.connect(self.confirm_delete_row)
        
        # adjust table size with window
        self.tableWidget.horizontalHeader().setSectionResizeMode(QtWidgets.QHeaderView.Stretch)
        self.tableWidget.verticalHeader().setSectionResizeMode(QtWidgets.QHeaderView.ResizeToContents)
        
        # connect signals for row selection
        self.tableWidget.itemSelectionChanged.connect(self.update_delete_button_state)
        self.update_delete_button_state()

        # connect signal for item editing
        self.tableWidget.itemChanged.connect(self.validate_item)

        # dictionary to store initial values
        self.initial_values = {}

    def load_data(self):
        self.tableWidget.setRowCount(0)
        if not self.file_path:
            return
        with open(self.file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file, delimiter=';')
            self.tableWidget.setColumnCount(4)
            self.tableWidget.setHorizontalHeaderLabels(["Game", "Date", "Score out of 10", "Additional Comments"])
            for row_data in reader:
                row_number = self.tableWidget.rowCount()
                self.tableWidget.insertRow(row_number)
                for column_number, data in enumerate(row_data):
                    self.tableWidget.setItem(row_number, column_number, QtWidgets.QTableWidgetItem(data))
                    self.initial_values[(row_number, column_number)] = data

    def save_data(self):
        if not self.file_path:
            return
        with open(self.file_path, 'w', encoding='utf-8', newline='') as file:
            writer = csv.writer(file, delimiter=';')
            for row in range(self.tableWidget.rowCount()):
                row_data = []
                empty_row = True
                for column in range(self.tableWidget.columnCount()):
                    item = self.tableWidget.item(row, column)
                    text = item.text() if item else ''
                    if text.strip():  # check if the cell is not empty
                        empty_row = False
                    row_data.append(text)
                if not empty_row:  # write row only if it's not empty
                    writer.writerow(row_data)

    def add_row(self):
        row_position = self.tableWidget.rowCount()
        self.tableWidget.insertRow(row_position)
        for column in range(self.tableWidget.columnCount()):
            self.tableWidget.setItem(row_position, column, QtWidgets.QTableWidgetItem(""))
            self.initial_values[(row_position, column)] = ""

    def confirm_delete_row(self):
        selected_rows = self.tableWidget.selectionModel().selectedRows()
        if selected_rows:
            reply = QtWidgets.QMessageBox.question(self, 'Confirm Delete', 'Are you sure you want to delete the selected row(s)?',
                                                   QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No, QtWidgets.QMessageBox.No)
            if reply == QtWidgets.QMessageBox.Yes:
                self.delete_row()

    def delete_row(self):
        indices = self.tableWidget.selectionModel().selectedRows()
        for index in sorted(indices):
            for column in range(self.tableWidget.columnCount()):
                if (index.row(), column) in self.initial_values:
                    del self.initial_values[(index.row(), column)]
            self.tableWidget.removeRow(index.row())
        self.update_delete_button_state()

    def update_delete_button_state(self):
        self.deleteRowButton.setEnabled(bool(self.tableWidget.selectionModel().selectedRows()))

    def validate_item(self, item):
        column = item.column()
        text = item.text()

        # Ensure no cell contains the character ';'
        if ";" in text:
            QtWidgets.QMessageBox.warning(self, "Invalid Input", "The character ';' is not allowed.")
            item.setText(self.initial_values.get((item.row(), column), ""))

        # Validate date column
        elif column == 1:
            if text and not self.validate_date(text):
                QtWidgets.QMessageBox.warning(self, "Invalid Input", "The date format must be DD/MM/YY and must be a valid date.")
                item.setText(self.initial_values.get((item.row(), column), ""))

        # Validate note column
        elif column == 2:
            if text and (not text.isdigit() or not (0 <= int(text) <= 10)):
                QtWidgets.QMessageBox.warning(self, "Invalid Input", "The score must be a number between 0 and 10.")
                item.setText(self.initial_values.get((item.row(), column), ""))

        # Save the new valid value
        self.initial_values[(item.row(), column)] = item.text()

    def validate_date(self, date_text):
        # Check format DD/MM/YY
        match = re.match(r"^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{2}$", date_text)
        if not match:
            return False

        # Validate the date components
        day, month, year = map(int, date_text.split("/"))
        return QtCore.QDate(year + 2000, month, day).isValid()
