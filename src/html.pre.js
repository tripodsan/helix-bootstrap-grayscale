/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const select = require('unist-util-select');
const hastSelectAll = require('hast-util-select').selectAll;
const toHAST = require('mdast-util-to-hast');
const toHTML = require('hast-util-to-html');
const mdastSqueezeParagraphs = require('mdast-squeeze-paragraphs');
const mdastFlattenImages = require('mdast-flatten-image-paragraphs');
const mdastFlattenLists = require('mdast-flatten-listitem-paragraphs');

/**
 * The 'pre' function that is executed before the HTML is rendered
 * @param payload The current payload of processing pipeline
 * @param payload.content The content
 */
function pre(payload) {

  // TODO move to pipeline
  payload.content.sections = PIPELINE_CUST.sectionsPipeline(payload);

  // EXTENSION point demo
  // -> I need a different DOM for the masthead section
  DOMAPI.decorate(payload.content.sections, 'masthead', 'h1', 'mx-auto my-0 text-uppercase');
  DOMAPI.decorate(payload.content.sections, 'masthead', 'h2', 'text-white-50 mx-auto mt-2 mb-5');
  DOMAPI.decorate(payload.content.sections, 'masthead', 'p a', 'btn btn-primary js-scroll-trigger');
  DOMAPI.sectionWrapper(payload.content.sections, 'masthead', ['h1', 'h2', 'p'], 'div', ['container d-flex h-100 align-items-center', 'mx-auto text-center']);

}

module.exports.pre = pre;

const DOMAPI = {
  decorate: function (sections, type, selector, css) {
    const sectionsFound = [];

    sections.children.forEach(function (s) {
      if (s.type == type) {
        sectionsFound.push(s);
      }
    });

    sectionsFound.forEach(function (s) {
      const nodes = hastSelectAll(selector, s.hast);

      console.log('hastSelectAll found hast node', nodes);
      nodes.forEach(function (node) {
        node.properties = node.properties || { className: '' };
        node.properties.className = node.properties.className || '';
        node.properties.className += ` ${css}`;
      });
    });

    //re-generate html
    DOMAPI.toHTML(sections);
  },

  // could become something like sections.select('hero p', 'hero h1').wrap('div', ['hero_wrapper', 'hero_text', 'hero_title']);
  // moves all "tagNames" nodes from a section inside multiple level of wrappers decorated by classes
  sectionWrapper: function (sections, type, tagNames, wrapperTag, classes) {
    const sectionsFound = [];

    sections.children.forEach(function (s) {
      if (s.type == type) {
        sectionsFound.push(s);
      }
    });

    sectionsFound.forEach(function (s) {
      let addToNode;
      let indexToRemove = [];
      s.hast.children.forEach(function (node, index) {
        if (tagNames.indexOf(node.tagName) !== -1) {
          console.log('found hast node', node);
          if (!addToNode) {
            // create new structure
            const rootNewNode = {};
            let currentNode = rootNewNode;
            classes.forEach(function (css, index) {
              currentNode.type = 'element';
              currentNode.tagName = wrapperTag;
              currentNode.properties = {
                className: css
              }
              currentNode.children = [];
              if (index < classes.length - 1) {
                //link next node to parent
                const n = currentNode;
                currentNode = {};
                n.children.push(currentNode);
              }
            });
            currentNode.children = [];
            console.log('new node to replace', rootNewNode);
            s.hast.children.splice(index, 1, rootNewNode);
            addToNode = currentNode;
          } else {
            // just remove node from current structure
            indexToRemove.push(index);
          }

          // append node to new structure
          addToNode.children.push(node);
        }
      });
      for (let i = indexToRemove.length - 1; i >= 0; i--) {
        s.hast.children.splice(indexToRemove[i], 1);
      }
    });

    //re-generate html
    DOMAPI.toHTML(sections);
  },

  toHTML: function(sections) {
    const sectionsHAST = [];

    sections.children.forEach(function (s) {
      s.html = toHTML(s.hast);
      sectionsHAST.push(s.hast);
    });

    sections.html = toHTML({
      type: 'root',
      children: sectionsHAST
    });
  }
  
};

const PIPELINE_CUST = {
  /**
   * The LayoutMachine is an implmentation of a state machine pattern
   * that tries to intelligently lay out the page.
   */
  LayoutMachine: {
    /*
      States:
        init -> hero, flow
        hero -> flow
    */
    validStates: ['init', 'masthead', 'about', 'projects', 'signup'],
    states: ['init'],
    get state() {
      return this.states[this.states.length - 1];
    },
    set state(v) {
      this.states.push(v);
      return v;
    },
    layout: function (section) {
      // allow manual overide of class
      // this might be instant-cruft–discuss.
      if (section.class && section.class.length) {
        // If class is a valid state, use it, otherwise default to 'flow'
        if (this.validStates.includes(section.class)) {
          this.states.push(section.class);
        } else {
          this.states.push('flow');
        }
      } else {
        switch (this.state) {
          case 'init':
            // if (this.isHero(section)) {
            this.state = 'masthead';
            break;
            // }
          case 'masthead':
            this.state = 'about';
            break;
          case 'about':
            this.state = 'projects';
            break;
          case 'projects':
            this.state = 'signup';
            break;
        }
        section.class = this.state;
      }

      let children = [];
      for (let e of section.children) {
        children.push(e);
      }
      section.children = children;
      return section;
    },

    get hasHero() {
      return this.states.includes('hero');
    },

    isHero(section) {
      // If the section has one paragraph and one image, it's a hero
      const images = select(section, 'image');
      const paragraphs = select(section, 'paragraph');
      return (paragraphs.length == 1 && images.length == 1);
    },

    isTextImage(section) {
      // If the section start with a paragraph then an image, it's a text image
      return (section.children.length > 1 && section.children[0].type == 'paragraph' && section.children[1].type == 'image');
    },

    isImageText(section) {
      // If the section start with an image then a paragraph, it's a text image
      return (section.children.length > 1 && section.children[1].type == 'paragraph' && section.children[0].type == 'image');
    },

    isText(section) {
      // If the section contains only paragraph and optionally starts with a heading, it's a text
      const images = select(section, 'image');
      const paragraphs = select(section, 'paragraph');
      const headings = select(section, 'heading');
      return images.length == 0 && paragraphs.length > 0 && (headings.length == 0 || section.children[0].type == 'heading');
    },

    isGallery(section) {
      // If the section has more than 2 images, it is a gallery
      const images = select(section, 'image');
      const paragraphs = select(section, 'paragraph');
      return images.length > 2 && paragraphs.length == 0;
    },
  },

  getSmartDesign: function (mdast, breakSection) {
    breakSection = breakSection ? breakSection : function (node) {
      return {
        break: node.type == 'thematicBreak',
        include: false
      }
    };

    mdast = mdastFlattenImages()(mdast);
    mdast = mdastFlattenLists()(mdast);
    mdast = mdastSqueezeParagraphs(mdast);

    const mdastNodes = mdast.children;

    let index = 0;
    const sections = [];
    let currentSection = {
      children: [],
      type: 'standard',
      index: index++
    };

    let title;

    mdastNodes.forEach(function (node) {
      const br = breakSection(node);
      if (br.break) {
        sections.push(PIPELINE_CUST.LayoutMachine.layout(currentSection));
        currentSection = {
          children: [],
          type: 'standard',
          index: index++
        };
        if (br.include) {
          currentSection.children.push(node);
        }
      } else {
        currentSection.children.push(node);
      }
    });

    sections.push(PIPELINE_CUST.LayoutMachine.layout(currentSection));
    return sections;
  },

  computeSectionsHAST: function (sectionsMdast) {
    const nodes = [];
    let odd = false;
    sectionsMdast.forEach(function (section) {
      const hast = toHAST(section);
      const htmlNodes = [];
      hast.children.forEach(function (h) {
        htmlNodes.push(toHTML(h));
      });
      nodes.push({
        type: "element",
        properties: {
          className: section.class + ' ' + ((odd = !odd) ? 'odd' : 'even'),
        },
        tagName: section.index > 0 ? 'section' : 'header',
        children: hast.children,
        data: {
          type: section.class
        }
      });
    });
    return nodes;
  },

  sectionsPipeline: function (payload, breakSection) {
    // get the sections MDAST
    const sectionsMdast = PIPELINE_CUST.getSmartDesign(payload.content.mdast, breakSection);

    // get the sections MDAST
    const sectionsHAST = PIPELINE_CUST.computeSectionsHAST(sectionsMdast);

    // create a "convienence object" that gives access to individual mdast, hast and html for each section.
    const sectionsDetails = [];

    sectionsMdast.forEach(function (mdast, index) {
      const hast = sectionsHAST[index];
      sectionsDetails.push({
        mdast: mdast,
        hast: hast,
        html: toHTML(hast),
        type: hast.data.type
      });
    });

    // convert full HAST to html
    const html = toHTML({
      type: 'root',
      children: sectionsHAST
    });

    return {
      html,
      children: sectionsDetails
    }
  }
};
