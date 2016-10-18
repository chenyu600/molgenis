package org.molgenis.fair.controller;

import org.molgenis.data.DataService;
import org.molgenis.data.Entity;
import org.molgenis.data.support.QueryImpl;
import org.molgenis.security.core.runas.RunAsSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import static org.molgenis.fair.controller.FairController.BASE_URI;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import static org.springframework.web.bind.annotation.RequestMethod.GET;

@Controller
@RequestMapping(BASE_URI)
public class FairController
{
	static final String BASE_URI = "/fdp";

	private final DataService dataService;

	@Autowired
	public FairController(DataService dataService)
	{
		this.dataService = dataService;
	}

	@RequestMapping(method = GET, produces = APPLICATION_JSON_VALUE)
	@ResponseBody
	@RunAsSystem
	public Entity getMetadata()
	{
		return dataService.findOne("fdp_Metadata", new QueryImpl<>());
	}
}
