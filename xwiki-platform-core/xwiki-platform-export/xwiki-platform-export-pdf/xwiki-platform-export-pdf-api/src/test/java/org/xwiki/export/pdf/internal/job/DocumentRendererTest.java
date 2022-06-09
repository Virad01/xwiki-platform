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
package org.xwiki.export.pdf.internal.job;

import java.util.Arrays;

import javax.inject.Named;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.xwiki.bridge.DocumentAccessBridge;
import org.xwiki.bridge.DocumentModelBridge;
import org.xwiki.component.manager.ComponentManager;
import org.xwiki.display.internal.DocumentDisplayer;
import org.xwiki.display.internal.DocumentDisplayerParameters;
import org.xwiki.export.pdf.job.PDFExportJobStatus.DocumentRenderingResult;
import org.xwiki.model.reference.DocumentReference;
import org.xwiki.rendering.block.WordBlock;
import org.xwiki.rendering.block.XDOM;
import org.xwiki.rendering.renderer.BlockRenderer;
import org.xwiki.rendering.renderer.printer.WikiPrinter;
import org.xwiki.rendering.syntax.Syntax;
import org.xwiki.rendering.transformation.RenderingContext;
import org.xwiki.test.junit5.mockito.ComponentTest;
import org.xwiki.test.junit5.mockito.InjectMockComponents;
import org.xwiki.test.junit5.mockito.MockComponent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link DocumentRenderer}.
 * 
 * @version $Id$
 */
@ComponentTest
class DocumentRendererTest
{
    @InjectMockComponents
    private DocumentRenderer documentRenderer;

    @MockComponent
    private DocumentAccessBridge documentAccessBridge;

    @MockComponent
    private RenderingContext renderingContext;

    @MockComponent
    @Named("configured")
    private DocumentDisplayer documentDisplayer;

    @MockComponent
    @Named("context")
    private ComponentManager contextComponentManager;

    @Mock
    private BlockRenderer html5Renderer;

    @Mock
    private DocumentModelBridge document;

    @BeforeEach
    void configure() throws Exception
    {
        when(this.renderingContext.getTargetSyntax()).thenReturn(Syntax.HTML_5_0);
        when(this.contextComponentManager.getInstance(BlockRenderer.class, Syntax.HTML_5_0.toIdString()))
            .thenReturn(this.html5Renderer);
    }

    @Test
    void render() throws Exception
    {
        DocumentReference documentReference = new DocumentReference("test", "Some", "Page");
        when(this.documentAccessBridge.getTranslatedDocumentInstance(documentReference)).thenReturn(this.document);

        XDOM xdom = new XDOM(Arrays.asList(new WordBlock("test")));
        when(this.documentDisplayer.display(same(this.document), any(DocumentDisplayerParameters.class)))
            .thenReturn(xdom);

        doAnswer(new Answer<Void>()
        {
            public Void answer(InvocationOnMock invocation)
            {
                WikiPrinter printer = (WikiPrinter) invocation.getArguments()[1];
                printer.print("some content");
                return null;
            }
        }).when(this.html5Renderer).render(same(xdom), any(WikiPrinter.class));

        DocumentRenderingResult result = this.documentRenderer.render(documentReference);
        assertEquals(documentReference, result.getDocumentReference());
        assertSame(xdom, result.getXDOM());
        assertEquals("some content", result.getHTML());
    }
}
