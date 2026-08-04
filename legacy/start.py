import sys
import json
import os
from PyQt5 import QtWidgets
from main import MainWindow

CONFIG_FILE = 'config.json'

def create_config_file():
    config = {
        'selected_folder': ''
    }
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

if not os.path.exists(CONFIG_FILE):
    create_config_file()

if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    main_win = MainWindow()
    main_win.show()
    sys.exit(app.exec_())
