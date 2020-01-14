/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
require.config({
  paths: {
    'export-tree': 'uicomponents/exporter/exporter',
    'entityReference': 'uicomponents/model/entityReference',
    'prototype': 'js/prototype/prototype'
  },
  shim: {
    entityReference: ['prototype']
  }
});

// Mock Velocity bindings.
var $jsontool = {
  serialize: function() {}
};
var $services = {
  webjars: {
    url: function() {
      return '';
    }
  },
  icon: {
    getMetaData: function() {
      return {};
    }
  },
  debug: {
    minify: false
  }
};

define(['jquery', 'entityReference', 'export-tree'], function($) {
  // Ignore parameters when data URI is used.
  var originalGet = $.get;
  $.get = function() {
    if (arguments[0].substring(0, 22) === 'data:application/json,') {
      // PhantomJS, used to run the tests in headless mode, doesn't seem to support AJAX requests to data URIs.
      return $.Deferred().resolve(JSON.parse(arguments[0].substring(22))).promise();
    } else {
      return originalGet.apply(this, arguments);
    }
  };

  var createExportTree = function(data) {
    var deferred = $.Deferred();
    // The 'data-url' attribute is mandatory for dynamic trees (otherwise the tree is static).
    var dataURL = 'data:application/json,' + JSON.stringify(data);
    // The root node type and reference (id) are required in order to be able to express the selection of the top level
    // pages using exclusions (we have to use exclusions if there is a top level pagination node that is checked).
    $('<div>').attr('data-url', dataURL).data('root', {
      id: 'xwiki',
      type: 'wiki'
    }).one('ready.jstree', function(event, data) {
      setTimeout(function() {
        deferred.resolve(data.instance);
      }, 0);
    }).exportTree();
    return deferred.promise();
  };

  var treeData = [
    {
      id: 'document:xwiki:A.WebHome',
      text: 'A',
      children: false,
      data: {
        id: 'xwiki:A.WebHome',
        type: 'document'
      }
    },
    {
      id: 'document:xwiki:B.WebHome',
      text: 'B',
      children: true,
      data: {
        id: 'xwiki:B.WebHome',
        type: 'document',
        validChildren: ['document', 'pagination'],
        childrenURL: 'data:application/json,' + JSON.stringify([
          {
            id: 'document:xwiki:B.D.WebHome',
            text: 'D',
            children: true,
            data: {
              id: 'xwiki:B.D.WebHome',
              type: 'document',
              validChildren: ['document', 'pagination'],
              childrenURL: 'data:application/json,' + JSON.stringify([
                {
                  id: 'document:xwiki:B.D.F.WebHome',
                  text: 'F',
                  children: false,
                  data: {
                    id: 'xwiki:B.D.F.WebHome',
                    type: 'document'
                  }
                }
              ])
            }
          },
          {
            id: 'document:xwiki:B.E',
            text: 'E',
            children: false,
            data: {
              id: 'xwiki:B.E',
              type: 'document'
            }
          },
          {
            id: 'pagination:document:xwiki:B.WebHome',
            text: 'More...',
            children: false,
            data: {
              type: 'pagination'
            }
          }
        ])
      }
    },
    {
      id: 'document:xwiki:C.WebHome',
      text: 'C',
      children: true,
      data: {
        id: 'xwiki:C.WebHome',
        type: 'document',
        validChildren: ['document', 'pagination'],
        childrenURL: 'data:application/json,' + JSON.stringify([
          {
            id: 'document:xwiki:C.G.WebHome',
            text: 'G',
            children: false,
            data: {
              id: 'xwiki:C.G.WebHome',
              type: 'document'
            }
          },
          {
            id: 'document:xwiki:C.H',
            text: 'H',
            children: false,
            data: {
              id: 'xwiki:C.H',
              type: 'document'
            }
          }
        ])
      }
    }
  ];

  var assertSelection = function(state, exportPages) {
    return createExportTree(data).done(function(tree) {
      expect(exportPages).toBe(tree.getExportPages());
    });
  };

  describe('Export Tree', function() {
    it('All nodes enabled', function(done) {
      createExportTree(treeData).done(function(tree) {
        // Everything is selected initially.
        expect(tree.isExportingAllPages()).toBe(true);
        expect(tree.hasExportPages()).toBe(true);
        expect(tree.getExportPages()).toEqual({
          'xwiki:A.WebHome': [],
          'xwiki:B.%': [],
          'xwiki:C.%': []
        });

        // Deselect all.
        tree.deselect_all();
        expect(tree.isExportingAllPages()).toBe(false);
        expect(tree.hasExportPages()).toBe(false);
        expect(tree.getExportPages()).toEqual({});

        // Select some nodes.
        tree.select_node(['document:xwiki:A.WebHome', 'document:xwiki:B.WebHome']);
        expect(tree.isExportingAllPages()).toBe(false);
        expect(tree.hasExportPages()).toBe(true);
        expect(tree.getExportPages()).toEqual({
          'xwiki:A.WebHome': [],
          'xwiki:B.%': []
        });

        // Expand a tree node.
        tree.open_node('document:xwiki:B.WebHome', function() {
          // Child nodes are selected by default if the parent node is selected.
          expect(tree.getExportPages()).toEqual({
            'xwiki:A.WebHome': [],
            'xwiki:B.%': []
          });

          // Exclude a leaf child node.
          tree.deselect_node('document:xwiki:B.E');
          expect(tree.getExportPages()).toEqual({
            'xwiki:A.WebHome': [],
            'xwiki:B.%': ['xwiki:B.E']
          });

          // Exclude a non-leaf child node.
          tree.deselect_node('document:xwiki:B.D.WebHome');
          tree.select_node('document:xwiki:B.E');
          expect(tree.getExportPages()).toEqual({
            'xwiki:A.WebHome': [],
            'xwiki:B.%': ['xwiki:B.D.%']
          });

          // Deselect the pagination node to force using includes.
          tree.deselect_node('pagination:document:xwiki:B.WebHome');
          tree.select_node('document:xwiki:B.D.WebHome');
          expect(tree.getExportPages()).toEqual({
            'xwiki:A.WebHome': [],
            'xwiki:B.WebHome': [],
            'xwiki:B.D.%': [],
            'xwiki:B.E': []
          });

          // Deselecting the children leaves the parent selected.
          tree.deselect_node(['document:xwiki:B.D.WebHome', 'document:xwiki:B.E']);
          expect(tree.getExportPages()).toEqual({
            'xwiki:A.WebHome': [],
            'xwiki:B.WebHome': []
          });

          // Expand a child node.
          tree.open_node('document:xwiki:B.D.WebHome', function() {
            // Child nodes are not selected by default if the parent node is not selected.
            expect(tree.getExportPages()).toEqual({
              'xwiki:A.WebHome': [],
              'xwiki:B.WebHome': []
            });

            tree.select_node('document:xwiki:B.D.F.WebHome');
            expect(tree.getExportPages()).toEqual({
              'xwiki:A.WebHome': [],
              'xwiki:B.WebHome': [],
              'xwiki:B.D.F.WebHome': []
            });

            // Deselecting the parent deselects all descendants.
            tree.deselect_node('document:xwiki:B.WebHome');
            expect(tree.getExportPages()).toEqual({
              'xwiki:A.WebHome': []
            });

            // Select only a descendant node.
            tree.deselect_node('document:xwiki:A.WebHome');
            tree.select_node('document:xwiki:B.D.F.WebHome');
            expect(tree.isExportingAllPages()).toBe(false);
            expect(tree.hasExportPages()).toBe(true);
            expect(tree.getExportPages()).toEqual({
              'xwiki:B.D.F.WebHome': []
            });

            // Verify a parent node without pagination.
            tree.open_node('document:xwiki:C.WebHome', function() {
              expect(tree.getExportPages()).toEqual({
                'xwiki:B.D.F.WebHome': []
              });

              // Selecting the parent node should select the child nodes.
              tree.select_node('document:xwiki:C.WebHome');
              expect(tree.getExportPages()).toEqual({
                'xwiki:B.D.F.WebHome': [],
                'xwiki:C.%': []
              });

              // Deselect a child node. Excludes should be used because the parent is selected.
              tree.deselect_node('document:xwiki:C.H');
              expect(tree.getExportPages()).toEqual({
                'xwiki:B.D.F.WebHome': [],
                'xwiki:C.%': ['xwiki:C.H']
              });

              // Deselect the parent node but keep a child node selected. Includes should be used this time.
              tree.deselect_node('document:xwiki:C.WebHome');
              tree.select_node('document:xwiki:C.G.WebHome');
              expect(tree.getExportPages()).toEqual({
                'xwiki:B.D.F.WebHome': [],
                'xwiki:C.G.WebHome': []
              });

              done();
            }, false);
          }, false);
        }, false);
      });
    });

    it('Top level pagination node', function(done) {
      var newTreeData = treeData.slice(0);
      newTreeData.push({
        id: 'pagination:wiki:xwiki',
        text: 'More...',
        children: false,
        data: {
          type: 'pagination'
        }
      });

      createExportTree(newTreeData).done(function(tree) {
        // Everything is selected initially, including the pagination node, which means we can't use includes.
        expect(tree.getExportPages()).toEqual({
          'xwiki:%.%': []
        });

        tree.deselect_node(['document:xwiki:A.WebHome', 'document:xwiki:C.WebHome']);
        expect(tree.getExportPages()).toEqual({
          'xwiki:%.%': ['xwiki:A.WebHome', 'xwiki:C.%']
        });

        // Deselect the pagination node to switch to includes.
        tree.deselect_node('pagination:wiki:xwiki');
        expect(tree.getExportPages()).toEqual({
          'xwiki:B.%': []
        });

        done();
      });
    });

    var disableNodes = function(nodes) {
      nodes.forEach(function(node) {
        node.state = {disabled: true, undetermined: true};
      });
    };

    it('With disabled nodes', function(done) {
      var newTreeData = $.extend(true, {}, {data: treeData}).data;
      var bChildren = JSON.parse(newTreeData[1].data.childrenURL.substring(22));
      // Disable B.WebHome, C.WebHome and B.D.WebHome
      disableNodes([newTreeData[1], newTreeData[2], bChildren[0]]);
      newTreeData[1].data.childrenURL = 'data:application/json,' + JSON.stringify(bChildren);

      createExportTree(newTreeData).done(function(tree) {
        // Everything is selected initially.
        expect(tree.isExportingAllPages()).toBe(true);
        expect(tree.hasExportPages()).toBe(true);
        expect(tree.getExportPages()).toEqual({
          'xwiki:A.WebHome': [],
          'xwiki:B.%': ['xwiki:B.WebHome'],
          'xwiki:C.%': ['xwiki:C.WebHome']
        });

        // Deselect A.WebHome in order to have only undetermined nodes.
        tree.deselect_node('document:xwiki:A.WebHome');
        expect(tree.isExportingAllPages()).toBe(false);
        expect(tree.hasExportPages()).toBe(true);
        expect(tree.getExportPages()).toEqual({
          'xwiki:B.%': ['xwiki:B.WebHome'],
          'xwiki:C.%': ['xwiki:C.WebHome']
        });

        // Open undetermined node.
        tree.open_node('document:xwiki:B.WebHome', function() {
          // Child nodes are selected by default. Excludes are used because of the checked pagination node.
          expect(tree.getExportPages()).toEqual({
            'xwiki:B.%': ['xwiki:B.WebHome', 'xwiki:B.D.%' ],
            'xwiki:B.D.%': ['xwiki:B.D.WebHome'],
            'xwiki:C.%': ['xwiki:C.WebHome']
          });

          // Deselect the pagination node to use includes instead.
          tree.deselect_node('pagination:document:xwiki:B.WebHome');
          expect(tree.getExportPages()).toEqual({
            'xwiki:B.D.%': ['xwiki:B.D.WebHome'],
            'xwiki:B.E': [],
            'xwiki:C.%': ['xwiki:C.WebHome']
          });

          // Open B.D.WebHome to verify an undetermined node without pagination.
          tree.open_node('document:xwiki:B.D.WebHome', function() {
            // Should use includes because there's no pagination node and the parent node is not selected.
            expect(tree.getExportPages()).toEqual({
              'xwiki:B.D.F.WebHome': [],
              'xwiki:B.E': [],
              'xwiki:C.%': ['xwiki:C.WebHome']
            });

            // Deselecting the child should deselect the parent.
            tree.deselect_node('document:xwiki:B.D.F.WebHome');
            expect(tree.is_undetermined('document:xwiki:B.D.WebHome')).toBe(false);
            expect(tree.getExportPages()).toEqual({
              'xwiki:B.E': [],
              'xwiki:C.%': ['xwiki:C.WebHome']
            });

            // Selecting the child should mark the parent as undetermined.
            tree.select_node('document:xwiki:B.D.F.WebHome');
            expect(tree.is_undetermined('document:xwiki:B.D.WebHome')).toBe(true);

            // Select none.
            tree.deselect_all();
            expect(tree.isExportingAllPages()).toBe(false);
            expect(tree.hasExportPages()).toBe(false);
            expect(tree.getExportPages()).toEqual({});

            // Select all preserves disabled nodes undetermined.
            tree.select_all();
            expect(tree.isExportingAllPages()).toBe(true);
            expect(tree.hasExportPages()).toBe(true);
            expect(tree.getExportPages()).toEqual({
              'xwiki:A.WebHome': [],
              'xwiki:B.%': ['xwiki:B.WebHome', 'xwiki:B.D.%'],
              'xwiki:B.D.F.WebHome': [],
              'xwiki:C.%': ['xwiki:C.WebHome']
            });
            
            // Select none again.
            tree.deselect_all();
            tree.open_node('document:xwiki:C.WebHome', function() {
              // Child nodes should be deselected because the parent is.
              expect(tree.isExportingAllPages()).toBe(false);
              expect(tree.hasExportPages()).toBe(false);
              expect(tree.getExportPages()).toEqual({});

              tree.select_node('document:xwiki:C.H');
              expect(tree.isExportingAllPages()).toBe(false);
              expect(tree.hasExportPages()).toBe(true);
              expect(tree.getExportPages()).toEqual({
                'xwiki:C.H': []
              });

              done();
            });
          });
        });
      });
    });
  });
});
