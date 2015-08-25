var remote = require('remote');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var webFrame = require('web-frame');
var dialogs = require("dialogs")({ url: "../static/img/cowboy-hat.svg" });
var Menu = remote.require('menu');

var template = [
  {
    label: 'Rodeo',
    submenu: [
      {
        label: 'About Rodeo',
        selector: 'orderFrontStandardAboutPanel:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences',
        accelerator: 'CmdOrCtrl+,',
        click: function() {
          showPreferences();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide Rodeo',
        accelerator: 'CmdOrCtrl+H',
        selector: 'hide:'
      },
      {
        label: 'Hide Others',
        accelerator: 'CmdOrCtrl+Shift+H',
        selector: 'hideOtherApplications:'
      },
      {
        label: 'Show All',
        selector: 'unhideAllApplications:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        selector: 'terminate:'
      },
    ]
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click: function() {
          $("#add-tab").click();
        }
      },
      {
        label: 'Open',
        accelerator: 'Shift+CmdOrCtrl+O',
        click: function() {
          openDialog();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+s',
        click: function() {
          saveEditor();
        }
      },
      {
        label: 'Save As',
        // accelerator: 'CmdOrCtrl+C',
        click: function() {
          saveEditor(null, true);
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Close File',
        accelerator: 'CmdOrCtrl+w',
        click: function() {
          if (variableWindow && variableWindow.isFocused()) {
            variableWindow.close();
          } else {
            var n = $("#editorsTab .active").attr("id").replace("editor-tab-", "");
            closeActiveTab(n);
          }
        }
      },
      {
        label: 'Close All Files',
        click: function() {
          alert("TODO");
        }
      }
    ]
  },
  {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "Command+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+Command+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "Command+X", selector: "cut:" },
        { label: "Copy", accelerator: "Command+C", selector: "copy:" },
        { label: "Paste", accelerator: "Command+V", selector: "paste:" },
        { label: "Select All", accelerator: "Command+A", selector: "selectAll:" }
      ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Change Editor',
        submenu: [
          {
            label: 'Move One Left',
            accelerator: 'CmdOrCtrl+Shift+Left',
            click: function() {
              var prevTab = $("#editorsTab .active").prev();
              if (prevTab && $("a", prevTab).attr("href")!="#") {
                $("a", prevTab).click();
              }
            }
          },
          {
            label: 'Move One Right',
            accelerator: 'CmdOrCtrl+Shift+Right',
            click: function() {
              var nextTab = $("#editorsTab .active").next();
              if (nextTab && $("a", nextTab).attr("href")!="#") {
                $("a", nextTab).click();
              }

            }
          }
        ]
      },
      {
        label: 'Focus',
        submenu: [
          {
            label: 'Editor',
            accelerator: 'CmdOrCtrl+1',
            click: function() {
              var id = $("#editors .active .editor").attr("id");
              var editor = ace.edit(id);
              editor.focus();
            }
          },
          {
            label: 'Console',
            accelerator: 'CmdOrCtrl+2',
            click: function() {
              jqconsole.Focus();
            }
          },
          {
            label: 'Variables/History',
            accelerator: 'CmdOrCtrl+3',
            click: function() {
              var next = $("#top-right .nav .active").next();
              if (! $(next).length) {
                next = $("#top-right .nav li").first();
              }
              $("a", next).click()
            }
          },
          {
            label: 'Files/Plots/Packages/Help',
            accelerator: 'CmdOrCtrl+4',
            click: function() {
              var next = $("#bottom-right .nav .active").next();
              if (! $(next).length) {
                next = $("#bottom-right .nav li").first();
              }
              $("a", next).click()
            }
          }
        ]
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function() { remote.getCurrentWindow().reload(); }
      },
      {
        label: 'Toggle DevTools',
        accelerator: 'Alt+CmdOrCtrl+I',
        click: function() { remote.getCurrentWindow().toggleDevTools(); }
      },
    ]
  },
  {
    label: 'Window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        selector: 'performMiniaturize:'
      },
      {
        label: 'Zoom to Default',
        accelerator: 'CmdOrCtrl+0',
        click: function() {
          webFrame.setZoomLevel(0);
          calibratePanes();
        }
      },
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+=',
        click: function() {
          webFrame.setZoomLevel(webFrame.getZoomLevel() + 1);
          calibratePanes();
        }
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: function() {
          webFrame.setZoomLevel(webFrame.getZoomLevel() - 1);
          calibratePanes();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        selector: 'arrangeInFront:'
      }
    ]
  },
  {
    label: 'Session',
    submenu: [
      {
        label: 'Restart Session',
        click: function() {
          remote.require('dialog').showMessageBox({
            type: "warning",
            buttons: ["Yes", "Cancel"],
            message: "Are you sure you want to restart your Python session?",
            detail: "Your data and variables will be deleted permanently."
          }, function(reply) {
            if (reply==0) {
              // yes, nuke it
              sendCommand("%reset -f", false);
            } else
              // do nothing
              return;
            });
        }
      },
      {
        label: 'Set Working Directory',
        click: function() {
          pickWorkingDirectory();
        }
      },
      {
        label: 'Run Previous Command',
        submenu: [
          {
            label: '2nd to Last',
            accelerator: 'CmdOrCtrl+Shift+2',
            click: function() {
              sendCommand($("#history-trail").children().slice(-2, -1).text());
            }
          },
          {
            label: 'Last',
            accelerator: 'CmdOrCtrl+Shift+1',
            click: function() {
              sendCommand($("#history-trail").children().slice(-1).text());
            }
          }
        ]
      }
    ]
  },
  {
    label: 'Help',
    submenu: []
  }
];

menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);

// context menu for file nav
var template = [
  {
    label: 'Change Working Directory',
    click: function() {
      pickWorkingDirectory();
    }
  },
  {
    label: 'Add Folder',
    click: function() {
      dialogs.prompt("Enter a name for your new folder: ", function(dirname) {
        if (dirname) {
          addFolderToWorkingDirectory(dirname);
        }
      });
    }
  }
];

fileMenu = Menu.buildFromTemplate(template);


// context menu for file nav
var template = [
  {
    label: 'Delete',
    click: function() {
      dialogs.confirm("Are you sure you want to delete " + path.basename(folderMenu.filename) +"? This will remove all files and directories within this folder.", function(ok) {
        if (ok) {
          rimraf(folderMenu.filename, function(err) {
            if (err) {
              console.error("[ERROR]: Could not delete: " + folderMenu.filename);
            } else {
              setFiles(USER_WD);
            }
          });
        }
      });
    }
  }
];

folderMenu = Menu.buildFromTemplate(template);